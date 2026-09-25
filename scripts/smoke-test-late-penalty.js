/**
 * smoke-test-late-penalty.js — uji terarah komponen LD (Fase 2) pada DB dev
 * (REVERSIBLE):
 *  1. Aktifkan latePenalty pada setupSystem (simpan nilai asli).
 *  2. Pindahkan karyawan uji sementara ke BU mode PRESENCE (BU dummy dibuat).
 *  3. Buat 4 baris TimeAttendance 'L' (lateMinutes 40/45/50/60) periode Sep-2026.
 *  4. Jalankan persistPayslip → verifikasi baris LD = 703.125
 *     (4×MINUTES = 203.125 + escalation 1 siklus FULL_DAY = 500.000),
 *     PPh tetap 263.000 (LD tidak masuk basis pajak), THP turun tepat sebesar LD.
 *  5. Bersihkan semua data uji.
 * Jalankan: node scripts/smoke-test-late-penalty.js
 */
require('dotenv').config();
const prisma = require('../libs/prisma');
const { persistPayslip } = require('../libs/payroll/persist');
const MARK = 'SMOKE-TEST-LD-DO-NOT-USE';

async function main() {
  const setupOriginal = await prisma.setupSystem.findFirst();
  const setup = {
    defaultTaxMethod: setupOriginal.defaultTaxMethod,
    taxRegime: setupOriginal.taxRegime,
    taxCalculationMethod: setupOriginal.taxCalculationMethod,
    thrBudgetBaseCodes: setupOriginal.thrBudgetBaseCodes,
    thrEligibilityMonths: setupOriginal.thrEligibilityMonths,
    thrProrateRoundDays: setupOriginal.thrProrateRoundDays,
    latePenaltyEnabled: 1,
    latePenaltyBaseCodes: 'BS',
    latePenaltyTiers: [
      { maxMinutes: 30, type: 'NONE' },
      { maxMinutes: 120, type: 'MINUTES' },
      { maxMinutes: null, type: 'HALF_DAY' },
    ],
    latePenaltyEscalation: { every: 3, type: 'FULL_DAY' },
  };

  const period = await prisma.cutOffPeriod.findFirst({ where: { monthPeriod: '09', yearPeriod: '2026' } });
  if (!period) throw new Error('Periode uji 09/2026 tidak ada — jalankan scripts/smoke-test-payroll.js dulu');

  const salaryTemplate = await prisma.salaryTemplateHeader.findFirst({ where: { templateName: 'Standard' } });
  if (!salaryTemplate) throw new Error('SalaryTemplateHeader "Standard" tidak ada');

  const user = await prisma.users.findFirst({ orderBy: { id: 'asc' } });
  const originalBUId = user.businessUnitId;
  const originalSalaryTemplateId = user.salaryTemplateHeaderId;
  const originalNpwp = user.npwp;

  // BU dummy PRESENCE
  const bu = await prisma.businessUnit.create({
    data: { businessUnitName: 'SMOKE-LD-' + Date.now(), attendanceMode: 'PRESENCE', createdBy: MARK, updatedBy: MARK },
  });
  const originalSalaries = await prisma.usersSalary.findMany({ where: { usersId: user.id } });
  await prisma.usersSalary.deleteMany({ where: { usersId: user.id } });
  await prisma.usersSalary.create({
    data: {
      usersId: user.id, componentId: 1, componentCode: 'BS', componentName: 'Basic Salary',
      salaryComponentTypeId: 7, salaryComponentTypeName: 'Fixed',
      salaryComponentCategoryId: 1, salaryComponentCategoryName: 'Earnings',
      amount: 10000000, isTakeHomePay: 1, sequence: 100,
      createdBy: MARK, updatedBy: MARK,
    },
  });
  await prisma.users.update({
    where: { id: user.id },
    data: { businessUnitId: bu.id, salaryTemplateHeaderId: salaryTemplate.id, npwp: user.npwp || '000000000000000' },
  });

  // Baris telat: 4 kejadian di hari kerja Sep-2026
  const lateRows = [];
  const lateSpecs = [40, 45, 50, 60];
  for (let i = 0; i < lateSpecs.length; i++) {
    const wd = new Date(Date.UTC(2026, 8, 1 + i));
    lateRows.push(await prisma.timeAttendance.create({
      data: {
        createdBy: MARK, updatedBy: MARK, status: 'L',
        employeeId: user.id, fullName: user.fullName,
        businessUnitId: bu.id, businessUnitName: bu.businessUnitName,
        workDate: wd, checkIn: new Date(Date.UTC(1970, 0, 1, 8, lateSpecs[i])),
        checkOut: new Date(Date.UTC(1970, 0, 1, 17, 0)),
        lateMinutes: lateSpecs[i], isDerived: 1,
      },
    }));
  }

  console.log(`Karyawan uji: id=${user.id} ${user.fullName} | BU dummy: ${bu.businessUnitName} (PRESENCE) | Telat: ${lateSpecs.join('/')} menit`);

  const built = await persistPayslip({ usersId: user.id, cutoffPeriodId: period.id, createdBy: 'smoke-test-ld', setup });

  console.log('\n--- PayslipDetails ---');
  for (const d of built.details) {
    console.log(
      `${String(d.sequence).padStart(5)} | ${d.category.padEnd(10)} | ${d.name.padEnd(32)} ` +
      `| THP=${d.isTakeHomePay} TAX=${d.isTaxBase} | Rp ${Number(d.amount).toLocaleString('id-ID')}`
    );
  }

  const ld = built.details.find((d) => d.code === 'LD');
  if (!ld) throw new Error('GAGAL: baris LD tidak ada di payslip');
  // dailyBase = 10jt/20 = 500.000; 4×MINUTES(40/45/50/60 dari 480) = 41.666,67+46.875+52.083,33+62.500 = 203.125
  // escalation: floor(4/3)=1 siklus × FULL_DAY 500.000 → total 703.125
  const expectedLD = 703125;
  if (Math.round(Number(ld.amount)) !== expectedLD) {
    throw new Error(`GAGAL: LD=${ld.amount}, harus ${expectedLD}`);
  }
  if (ld.category !== 'Deductions' || ld.isTaxBase !== 0) throw new Error('GAGAL: atribut baris LD salah');

  const pphRow = built.details.find((d) => d.code === 'TD');
  const thp = built.details
    .filter((d) => d.isTakeHomePay === 1)
    .reduce((acc, d) => acc + (d.category === 'Earnings' ? Number(d.amount) : -Number(d.amount)), 0);
  console.log(`\nLD=${Number(ld.amount).toLocaleString('id-ID')} | PPh21=${pphRow ? Number(pphRow.amount).toLocaleString('id-ID') : 0} | THP=${thp.toLocaleString('id-ID')}`);

  // Baseline dari smoke-test-payroll: PPh 263.000, THP 10.000.000 (BS 10jt, tanpa LD).
  if (pphRow && Math.round(Number(pphRow.amount)) !== 263000) {
    throw new Error(`GAGAL: PPh21 berubah jadi ${pphRow.amount} — LD seharusnya tidak masuk basis pajak`);
  }
  if (Math.round(thp) !== 10000000 - expectedLD) {
    throw new Error(`GAGAL: THP=${thp}, harus ${10000000 - expectedLD}`);
  }
  console.log('LD benar: potongan THP saja, PPh21 tidak berubah, THP turun tepat sebesar LD.');

  console.log('\nSMOKE LD: PASS');
  return { user, originalBUId, originalSalaryTemplateId, originalNpwp, originalSalaries, bu, lateRowIds: lateRows.map((r) => r.id) };
}

async function cleanup({ user, originalBUId, originalSalaryTemplateId, originalNpwp, originalSalaries, bu, lateRowIds }) {
  const MARK = 'SMOKE-TEST-LD-DO-NOT-USE';
  // 1. Payslip uji (detail dulu, lalu header)
  const headers = await prisma.payslipHeader.findMany({
    where: { usersId: user.id, createdBy: 'smoke-test-ld' }, select: { id: true },
  });
  if (headers.length > 0) {
    await prisma.payslipDetails.deleteMany({ where: { payslipHeaderId: { in: headers.map((h) => h.id) } } });
    await prisma.payslipHeader.deleteMany({ where: { id: { in: headers.map((h) => h.id) } } });
  }
  // 2. Baris kehadiran uji
  await prisma.timeAttendance.deleteMany({ where: { createdBy: MARK } });
  // 3. Gaji: kembalikan kondisi asli
  await prisma.usersSalary.deleteMany({ where: { usersId: user.id } });
  if (originalSalaries.length > 0) {
    await prisma.usersSalary.createMany({ data: originalSalaries.map((s) => ({
      usersId: s.usersId, componentId: s.componentId, componentCode: s.componentCode,
      componentName: s.componentName, salaryComponentTypeId: s.salaryComponentTypeId,
      salaryComponentTypeName: s.salaryComponentTypeName, salaryComponentCategoryId: s.salaryComponentCategoryId,
      salaryComponentCategoryName: s.salaryComponentCategoryName, amount: s.amount,
      isTakeHomePay: s.isTakeHomePay, sequence: s.sequence, createdBy: s.createdBy, updatedBy: s.updatedBy,
    })) });
  }
  // 4. BU: pakai snapshot asli; fallback dari TimeAttendance non-dummy; fallback 1
  let buToRestore = originalBUId;
  if (!buToRestore) {
    const ta = await prisma.timeAttendance.findFirst({
      where: { employeeId: user.id, NOT: { businessUnitName: { startsWith: 'SMOKE-LD-' } } },
      select: { businessUnitId: true }, orderBy: { id: 'desc' },
    });
    buToRestore = ta && ta.businessUnitId ? ta.businessUnitId : 1;
  }
  await prisma.users.update({
    where: { id: user.id },
    data: { businessUnitId: buToRestore, salaryTemplateHeaderId: originalSalaryTemplateId, npwp: originalNpwp },
  });
  // 5. BU dummy
  if (bu) await prisma.businessUnit.delete({ where: { id: bu.id } }).catch(() => {});
}

main()
  .then((state) => cleanup(state))
  .then(() => { console.log('Cleanup selesai — DB kembali seperti semula.'); process.exit(0); })
  .catch((e) => { console.error('SMOKE GAGAL:', e.message); process.exit(1); });
