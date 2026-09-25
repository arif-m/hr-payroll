/**
 * engine.js — Orkestrator payroll: satu tempat untuk membangun seluruh
 * payslip seorang karyawan untuk satu periode. Dipakai kedua jalur generate
 * (per-karyawan dan semua-karyawan) — tidak ada lagi duplikasi logika.
 *
 * Model akumulasi:
 *  - brutto        : basis pajak (salary earnings + lembur + iuran karyawan yang
 *                    ditanggung perusahaan (gross-up) + Tax Allowance).
 *  - deductionsThp : potongan yang mengurangi take home pay.
 *  - Baris BPJS bagian perusahaan = INFORMASI saja (isTaxBase=0, tidak masuk
 *    brutto & tidak mengurangi THP) — sesuai praktik payroll Indonesia.
 *
 * PPh 21 dihitung TERAKHIR dari brutto lengkap (TER Jan–Nov, koreksi Desember,
 * atau Legacy) — memperbaiki bug urutan hitung versi lama.
 */
const prisma = require('../prisma');
const moment = require('moment');
const { D, round, roundToThousandDown } = require('./money');
const tax21 = require('./tax21');
const bpjs = require('./bpjs');
const { loadTaxConfig } = require('./config');
const thr = require('./thr');
const latePenalty = require('./late-penalty');
const { getTotalDayOfCalendar } = require('../../helper/get-total-calendar');

const CATEGORY_EARNINGS = 'Earnings';
const CATEGORY_DEDUCTIONS = 'Deductions';

/** Kode komponen khusus yang dibuat engine. */
const ENGINE_CODES = {
  OVERTIME: 'OC',
  TAX_ALLOWANCE: 'TA',
  PPH21: 'TD',
  LATE_DEDUCTION: 'LD',
  THR: 'THR',
  BPJS_KESEHATAN_COMPANY: 'BKS',
  BPJS_KESEHATAN_EMPLOYEE: 'BKE',
};

// ---------------------------------------------------------------------------
// Kehadiran & cuti
// ---------------------------------------------------------------------------

/** Hari absen (status 'A') dalam periode. */
async function countAbsentDays(usersId, startPeriod, endPeriod) {
  return prisma.timeAttendance.count({
    where: {
      employeeId: usersId,
      status: 'A',
      workDate: { lte: endPeriod, gte: startPeriod },
    },
  });
}

/**
 * Hari efektif cuti approved yang menyentuh periode.
 * leaveType seed: 1=Annual, 2=Sick, 3=Sick-with-letter, 4=Unpaid.
 */
async function collectLeaves(usersId, leaveType, startPeriod, endPeriod) {
  const rows = await prisma.requestLeave.findMany({
    where: {
      AND: [
        { leaveType },
        { employeeId: usersId },
        {
          OR: [
            { startDuration: { lte: endPeriod, gte: startPeriod } },
            { endDuration: { lte: endPeriod, gte: startPeriod } },
          ],
        },
        { isApproved: 1 },
      ],
    },
    select: { id: true, startDuration: true, endDuration: true },
  });

  let totalDays = 0;
  for (const row of rows) {
    const start = moment.max(moment(row.startDuration), moment(startPeriod)).toDate();
    const end = moment.min(moment(row.endDuration), moment(endPeriod)).toDate();
    if (moment(start).isAfter(end)) continue;
    const days = moment(end).diff(moment(start), 'days') + 1;
    const holidays = await getTotalDayOfCalendar(start, days);
    totalDays += days - holidays;
  }
  return totalDays;
}

// ---------------------------------------------------------------------------
// Engine utama
// ---------------------------------------------------------------------------

/**
 * Bangun payslip lengkap satu karyawan untuk satu periode (belum menulis DB).
 * @returns {Object} { header, totals: {brutto, deductionsThp},
 *                     details: [{code,name,category,isTakeHomePay,isTaxBase,amount,sequence}] }
 */
async function buildPayslip({ usersId, cutoffPeriod, createdBy, setupSystem: setupSystemArg, taxConfig: taxConfigArg }) {
  const startPeriod = cutoffPeriod.startPeriod;
  const endPeriod = cutoffPeriod.endPeriod;
  const workDays = Number(cutoffPeriod.workDays) || 0;

  const user = await prisma.users.findFirst({
    where: { id: usersId },
    select: {
      id: true, employeeId: true, fullName: true, npwp: true,
      salaryTemplateHeaderId: true,
      is_using_bjps_kesehatan: true,
      ptkp: { select: { code: true, amount: true } },
      division: { select: { divisionName: true } },
      jobTitle: { select: { jobTitleName: true } },
      businessUnit: { select: { attendanceMode: true } },
    },
  });
  if (!user) throw new Error(`Karyawan id=${usersId} tidak ditemukan`);
  if (user.salaryTemplateHeaderId == null) {
    throw new Error(`${user.fullName}: setup gaji karyawan belum dilakukan`);
  }

  // Setup sistem dibaca lebih awal: menentukan regime & metode gross-up.
  const setupSystem = setupSystemArg || (await prisma.setupSystem.findFirst({
    select: {
      defaultTaxMethod: true, taxRegime: true, taxCalculationMethod: true,
      thrBudgetBaseCodes: true, thrEligibilityMonths: true, thrProrateRoundDays: true,
      latePenaltyEnabled: true, latePenaltyBaseCodes: true,
      latePenaltyTiers: true, latePenaltyEscalation: true,
    },
  }));
  const isGrossUp = setupSystem ? setupSystem.defaultTaxMethod === 'GrossUp' : true;

  // Konfigurasi tarif PPh 21 dari DB (pkp/ptkp/terRate/setupSystem);
  // dapat di-inject untuk testing. Fallback default bila DB kosong.
  const taxConfig = taxConfigArg || (await loadTaxConfig());
  // Snapshot tarif efektif yang dipakai payslip ini — tersimpan di header
  // agar payslip historis tetap bisa direproduksi persis setelah regulasi/data berubah.
  const taxConfigSnapshot = tax21.normalizeConfig(taxConfig);

  // --- 1. Kehadiran & cuti -------------------------------------------------
  // Baris 'L' (telat, mode PRESENCE) untuk sanksi LD — hanya jika enabled.
  const needLateEvents = setupSystem && Number(setupSystem.latePenaltyEnabled) === 1;
  const [absentDays, sickDays, sickLetterDays, annualLeaveDays, unpaidLeaveDays, lateEventRows] = await Promise.all([
    countAbsentDays(usersId, startPeriod, endPeriod),
    collectLeaves(usersId, 2, startPeriod, endPeriod),
    collectLeaves(usersId, 3, startPeriod, endPeriod),
    collectLeaves(usersId, 1, startPeriod, endPeriod),
    collectLeaves(usersId, 4, startPeriod, endPeriod),
    needLateEvents
      ? prisma.timeAttendance.findMany({
          where: { employeeId: usersId, status: 'L', workDate: { lte: endPeriod, gte: startPeriod } },
          select: { lateMinutes: true },
        })
      : Promise.resolve([]),
  ]);
  const presentDays = Math.max(
    workDays - absentDays - sickDays - sickLetterDays - annualLeaveDays - unpaidLeaveDays, 0
  );

  // --- 2. Komponen gaji ----------------------------------------------------
  const salaryComponents = await prisma.usersSalary.findMany({ where: { usersId } });

  const details = [];
  let brutto = D(0);          // basis pajak
  let deductionsThp = D(0);   // potongan THP

  const pushDetail = (d) => details.push(d);

  for (const comp of salaryComponents) {
    let amount;
    if (comp.salaryComponentTypeName === 'Variable') {
      const paidDays = presentDays + annualLeaveDays + sickDays + sickLetterDays;
      amount = round(D(comp.amount).times(paidDays).div(workDays));
    } else if (comp.salaryComponentTypeName === 'Fixed') {
      amount = D(comp.amount);
    } else {
      continue; // 'Formula' & tipe lain: belum didukung (perilaku lama dipertahankan)
    }

    const isEarning = comp.salaryComponentCategoryName === CATEGORY_EARNINGS;
    if (isEarning) brutto = brutto.plus(amount);
    else deductionsThp = deductionsThp.plus(amount);

    pushDetail({
      code: comp.componentCode,
      name: comp.componentName,
      category: comp.salaryComponentCategoryName,
      isTakeHomePay: comp.isTakeHomePay,
      isTaxBase: 1,
      amount: amount.toNumber(),
      sequence: comp.sequence ?? 0,
    });
  }

  // --- 2b. THR (periode bertanda isThr) ------------------------------------
  // THR = earning biasanya: masuk brutto (basis pajak), THP, dan PPh 21 TER
  // bulan berjalan — sesuai praktik (THR kena PPh 21 final TER di bulan bayar).
  if (Number(cutoffPeriod.isThr) === 1) {
    const thrResult = await thr.calculateTHR({
      usersId, cutoffPeriod, setup: setupSystem, prisma, actor: createdBy,
    });
    if (thrResult.eligible && thrResult.amount > 0) {
      brutto = brutto.plus(thrResult.amount);
      pushDetail({
        code: ENGINE_CODES.THR, name: 'THR (Tunjangan Hari Raya)',
        category: CATEGORY_EARNINGS, isTakeHomePay: 1, isTaxBase: 1,
        amount: thrResult.amount, sequence: 900,
      });
    }
  }

  // --- 3. Lembur (masuk basis pajak) --------------------------------------
  const overtimeRows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(hourlyWages * multiplier), 0) AS amount
    FROM requestOvertimeDetails d
    JOIN requestOvertimeHeader h ON h.id = d.requestOvertimeHeaderId
    WHERE d.employeeId = ${usersId}
      AND h.overtimeDate BETWEEN ${startPeriod} AND ${endPeriod}`;
  const overtimeAmount = round(D(overtimeRows && overtimeRows[0] ? overtimeRows[0].amount : 0)).toNumber();
  if (overtimeAmount > 0) {
    brutto = brutto.plus(overtimeAmount);
    pushDetail({
      code: ENGINE_CODES.OVERTIME, name: 'Overtime Compensation',
      category: CATEGORY_EARNINGS, isTakeHomePay: 1, isTaxBase: 1,
      amount: overtimeAmount, sequence: 1010,
    });
  }

  // --- 4a. BPJS Tenaga Kerja (dari template) --------------------------------
  const tkTemplate = await prisma.templateBpjsTenagaKerjaDetails.findMany({
    where: { salaryTemplateId: user.salaryTemplateHeaderId },
  });

  // Upah dasar iuran dihitung dari komponen formula yang sudah ada di memori.
  const wageBaseFor = (formulaCodes) => {
    let sum = D(0);
    for (const comp of salaryComponents) {
      if (formulaCodes.includes(comp.componentCode) && comp.amount != null) {
        sum = sum.plus(D(comp.amount));
      }
    }
    return sum;
  };

  for (const item of tkTemplate) {
    if (!item.formula) continue;
    const formulaCodes = String(item.formula).split(',').map((s) => s.trim());
    const wageBase = wageBaseFor(formulaCodes);

    let amount;
    if (item.maximumWages && D(item.maximumWages).gt(0) && wageBase.gt(item.maximumWages)) {
      amount = round(D(item.maximumWages).times(item.percentage).div(100));
    } else {
      amount = round(wageBase.times(item.percentage).div(100));
    }

    const isEmployeeShare = Number(item.isTakeHomePay) === 1;
    if (isEmployeeShare) {
      // Iuran bagian karyawan: mengurangi THP.
      deductionsThp = deductionsThp.plus(amount);
      pushDetail({
        code: item.componentCode, name: item.componentName,
        category: CATEGORY_DEDUCTIONS, isTakeHomePay: 1, isTaxBase: 1,
        amount: amount.toNumber(), sequence: item.sequence ?? 0,
      });
      if (isGrossUp) {
        // Gross-up: perusahaan menanggung iuran karyawan → earnings + allowance
        // (net THP nol, tetap masuk basis pajak sebagai penghasilan).
        brutto = brutto.plus(amount);
        pushDetail({
          code: item.componentCode, name: `${item.componentName} Allowance`,
          category: CATEGORY_EARNINGS, isTakeHomePay: 1, isTaxBase: 1,
          amount: amount.toNumber(), sequence: item.sequence ?? 0,
        });
      }
    } else {
      // Iuran bagian perusahaan: baris informasi saja.
      pushDetail({
        code: item.componentCode, name: item.componentName,
        category: CATEGORY_EARNINGS, isTakeHomePay: 0, isTaxBase: 0,
        amount: amount.toNumber(), sequence: item.sequence ?? 0,
      });
    }
  }

  // --- 4b. BPJS Kesehatan (fitur yang sebelumnya tidak berjalan) ------------
  const bsRow = salaryComponents.find((c) => c.componentCode === 'BS');
  const kesehatanResult = bpjs.kesehatan({
    wage: bsRow ? Number(bsRow.amount) : 0,
    enabled: Number(user.is_using_bjps_kesehatan) === 1,
  });
  if (kesehatanResult.applied) {
    pushDetail({
      code: ENGINE_CODES.BPJS_KESEHATAN_COMPANY, name: 'BPJS Kesehatan (Perusahaan 4%)',
      category: CATEGORY_EARNINGS, isTakeHomePay: 0, isTaxBase: 0,
      amount: kesehatanResult.company, sequence: 1500,
    });
    deductionsThp = deductionsThp.plus(kesehatanResult.employee);
    pushDetail({
      code: ENGINE_CODES.BPJS_KESEHATAN_EMPLOYEE, name: 'BPJS Kesehatan (Karyawan 1%)',
      category: CATEGORY_DEDUCTIONS, isTakeHomePay: 1, isTaxBase: 1,
      amount: kesehatanResult.employee, sequence: 2600,
    });
  }

  // --- 5. PPh 21 (terakhir, dari brutto lengkap) ---------------------------
  const regime = (setupSystem && setupSystem.taxRegime) || 'TER';
  const method = setupSystem ? setupSystem.defaultTaxMethod : 'GrossUp';

  const ptkpCode = user.ptkp ? user.ptkp.code : 'TK/0';
  const hasNpwp = !!(user.npwp && String(user.npwp).trim() !== '');
  const isDecember = String(cutoffPeriod.monthPeriod) === '12';

  let pph = D(0);

  if (regime === 'TER') {
    if (!isDecember) {
      const r = tax21.calculateMonthlyTax21({
        monthlyBrutto: brutto.toNumber(), ptkpCode, hasNpwp, grossUp: isGrossUp,
        config: taxConfig,
      });
      pph = D(r.pph);
    } else {
      // Desember: koreksi setahun. Bruto Jan–Nov direkonstruksi dari payslip.
      const paidTer = await sumPphDetail(usersId, cutoffPeriod.yearPeriod);
      const baseJanToNov = await sumAnnualTaxBaseBrutto(usersId, cutoffPeriod.yearPeriod);
      const baseDec = brutto.toNumber();

      if (isGrossUp) {
        // P_{n+1} = TaxTahunan(base + G + P_n) − G ; G = PPh gross-up Jan–Nov.
        const G = paidTer;
        pph = D(tax21.grossUpIterative((pCandidate) => {
          const r = tax21.calculateDecemberAdjustment({
            annualBruttoBase: baseJanToNov + baseDec,
            annualGrossUpPph: G + pCandidate,
            pphTerPaidJanToNov: G,
            ptkpCode, hasNpwp, config: taxConfig,
          });
          return r.pphDecember;
        }));
      } else {
        const r = tax21.calculateDecemberAdjustment({
          annualBruttoBase: baseJanToNov + baseDec,
          annualGrossUpPph: 0,
          pphTerPaidJanToNov: paidTer,
          ptkpCode, hasNpwp, config: taxConfig,
        });
        pph = D(r.pphDecember);
      }
    }
  } else {
    // Legacy: Gross / Netto / GrossUp dengan algoritma progresif yang benar.
    // GrossUp sudah diiterasi di dalam calculateLegacyMonthlyTax21.
    const legacyMethod = isGrossUp ? 'GrossUp' : (method === 'Netto' ? 'Netto' : 'Gross');
    const basis = legacyMethod === 'Netto' ? brutto.minus(deductionsThp).toNumber() : brutto.toNumber();
    const r = tax21.calculateLegacyMonthlyTax21({
      monthlyBrutto: basis, ptkpCode, hasNpwp, method: legacyMethod, config: taxConfig,
    });
    pph = D(r.pph);
  }

  // Pembulatan ribuan penuh untuk PPh kurang bayar positif.
  if (pph.gt(0)) pph = D(roundToThousandDown(pph));

  if (!pph.eq(0)) {
    if (isGrossUp && pph.gt(0)) {
      brutto = brutto.plus(pph);
      pushDetail({
        code: ENGINE_CODES.TAX_ALLOWANCE, name: 'Tax Allowance',
        category: CATEGORY_EARNINGS, isTakeHomePay: 1, isTaxBase: 1,
        amount: pph.toNumber(), sequence: 3000,
      });
    }
    deductionsThp = deductionsThp.plus(pph);
    pushDetail({
      code: ENGINE_CODES.PPH21, name: 'PPH 21',
      category: CATEGORY_DEDUCTIONS, isTakeHomePay: 1, isTaxBase: 1,
      amount: pph.toNumber(), sequence: 4000,
    });
  }

  // --- 5b. Sanksi telat (LD) — hanya BU PRESENCE + latePenaltyEnabled ------
  // Potongan THP saja (isTaxBase 0): penalti bukan penghasilan, tidak masuk
  // basis PPh 21. ABSENT/'M' tidak dikenai LD (anti double-penalty).
  if (
    needLateEvents &&
    lateEventRows.length > 0 &&
    user.businessUnit && user.businessUnit.attendanceMode === 'PRESENCE'
  ) {
    const baseCodes = String(setupSystem.latePenaltyBaseCodes || 'BS')
      .split(',').map((c) => c.trim()).filter(Boolean);
    const monthlyBase = salaryComponents.reduce((acc, comp) => {
      if (comp.salaryComponentTypeName === 'Fixed' && baseCodes.includes(comp.componentCode) && comp.amount != null) {
        return acc.plus(D(comp.amount));
      }
      return acc;
    }, D(0));
    const dailyBaseAmount = workDays > 0 ? monthlyBase.div(workDays).toNumber() : 0;
    let penaltyTiers = setupSystem.latePenaltyTiers;
    let penaltyEscalation = setupSystem.latePenaltyEscalation;
    if (typeof penaltyTiers === 'string') { try { penaltyTiers = JSON.parse(penaltyTiers); } catch (e) { penaltyTiers = null; } }
    if (typeof penaltyEscalation === 'string') { try { penaltyEscalation = JSON.parse(penaltyEscalation); } catch (e) { penaltyEscalation = null; } }

    const penalty = latePenalty.calculateLatePenalty({
      lateEvents: lateEventRows,
      dailyBaseAmount,
      tiers: penaltyTiers,
      escalation: penaltyEscalation,
    });
    if (penalty.total > 0) {
      deductionsThp = deductionsThp.plus(penalty.total);
      pushDetail({
        code: ENGINE_CODES.LATE_DEDUCTION, name: 'Late Deduction',
        category: CATEGORY_DEDUCTIONS, isTakeHomePay: 1, isTaxBase: 0,
        amount: penalty.total, sequence: 4050,
      });
    }
  }

  // --- 6. Header & hasil ----------------------------------------------------
  const header = {
    createdBy,
    updatedBy: createdBy,
    cutOffPeriodId: cutoffPeriod.id,
    monthPeriod: String(cutoffPeriod.monthPeriod),
    yearPeriod: String(cutoffPeriod.yearPeriod),
    startPeriod, endPeriod, workDays,
    usersId: user.id,
    employeeId: Number(user.employeeId),
    fullName: user.fullName,
    organization: user.division ? user.division.divisionName : '',
    jobTitle: user.jobTitle ? user.jobTitle.jobTitleName : '',
    ptkp: ptkpCode,
    npwp: user.npwp || '',
    attendance: presentDays,
    absent: absentDays,
    sick: sickDays + sickLetterDays,
    paidLeave: annualLeaveDays,
    unpaidLeave: unpaidLeaveDays,
    taxConfigSnapshot,
  };

  return {
    header,
    details,
    totals: { brutto: brutto.toNumber(), deductionsThp: deductionsThp.toNumber() },
  };
}

// ---------------------------------------------------------------------------
// Rekap tahunan untuk koreksi Desember
// ---------------------------------------------------------------------------

/** Akumulasi PPh 21 (kode TD) yang dipotong Jan–Nov pada tahun berjalan. */
async function sumPphDetail(usersId, yearPeriod) {
  const rows = await prisma.payslipDetails.findMany({
    where: {
      code: ENGINE_CODES.PPH21,
      payslip: {
        usersId,
        yearPeriod: String(yearPeriod),
        monthPeriod: { in: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'] },
      },
    },
    select: { amount: true },
  });
  let sum = D(0);
  for (const r of rows) sum = sum.plus(r.amount);
  return sum.toNumber();
}

/**
 * Rekap bruto basis pajak Jan–Nov:
 *   base = Σ(earnings isTaxBase=1) − Σ(deductionsThp isTaxBase=1)
 * dengan TA dan TD dikecualikan:
 *   - TD (PPh) bukan pengurang bruto, ia dikembalikan pemanggil sebagai
 *     paidTer / G dan diposisikan eksplisit dalam formula tahunan.
 *   - TA (tax allowance gross-up) diposisikan eksplisit via annualGrossUpPph.
 */
async function sumAnnualTaxBaseBrutto(usersId, yearPeriod) {
  const rows = await prisma.payslipDetails.findMany({
    where: {
      isTaxBase: 1,
      payslip: {
        usersId,
        yearPeriod: String(yearPeriod),
        monthPeriod: { in: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'] },
      },
    },
    select: { category: true, code: true, amount: true },
  });
  let sum = D(0);
  for (const r of rows) {
    if (r.code === ENGINE_CODES.TAX_ALLOWANCE || r.code === ENGINE_CODES.PPH21) continue;
    sum = r.category === CATEGORY_EARNINGS ? sum.plus(r.amount) : sum.minus(r.amount);
  }
  return sum.toNumber();
}

module.exports = {
  buildPayslip,
  ENGINE_CODES,
  countAbsentDays,
  collectLeaves,
};
