/**
 * run.js — PayrollRun: siklus proses payroll per periode.
 *
 * Status: DRAFT → SUBMITTED → APPROVED → LOCKED
 *   - DRAFT     : payslip bisa digenerate/re-generate/dikoreksi bebas.
 *   - SUBMITTED : diajukan HR untuk review; edit terkunci (bisa dikembalikan
 *                 ke DRAFT oleh reviewer dengan catatan).
 *   - APPROVED  : disetujui atasannya; angka final, menunggu penguncian.
 *   - LOCKED    : final & terkunci — payslip pada run ini tidak bisa diubah
 *                 lagi dari jalur manapun (dasar laporan & pembayaran).
 *
 * Prinsip:
 *  - Snapshot tarif diambil dari DB saat run DIBUAT → semua payslip dalam run
 *    dihitung dengan tarif yang konsisten, dan tersimpan untuk audit.
 *  - Guard ganda: orkestrator di sini + guard di persist.js (mesin tidak bisa
 *    dilewati dari jalur manapun).
 */
const prisma = require('../prisma');
const { loadTaxConfig } = require('./config');
const tax21 = require('./tax21');
const { persistPayslip } = require('./persist');
const { TRANSITIONS, assertTransition, assertRunWritable } = require('./run-state');

/** Ambil run untuk satu periode; buat DRAFT baru (dengan snapshot tarif) bila belum ada. */
async function getOrCreateRun(cutOffPeriodId, actor) {
  let run = await prisma.payrollRun.findUnique({ where: { cutOffPeriodId: Number(cutOffPeriodId) } });
  if (run) return run;

  const taxConfig = await loadTaxConfig();
  run = await prisma.payrollRun.create({
    data: {
      cutOffPeriodId: Number(cutOffPeriodId),
      status: 'DRAFT',
      taxConfigSnapshot: tax21.normalizeConfig(taxConfig),
      createdBy: actor,
      updatedBy: actor,
    },
  });
  return run;
}

/**
 * Generate payslip untuk seluruh (atau sebagian) karyawan dalam satu run.
 * Detail hasil per karyawan dicatat di payrollRunDetail (OK/FAILED + angka).
 */
async function generateRunEmployees({ runId, employeeIds = null, createdBy }) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: Number(runId) },
    include: { cutOffPeriod: true },
  });
  assertRunWritable(run);
  if (run.cutOffPeriod.isClosing === 1) {
    throw new Error('Periode cut-off sudah closing — tidak bisa digenerate');
  }

  const setup = await prisma.setupSystem.findFirst({
    select: {
      defaultTaxMethod: true, taxRegime: true, taxCalculationMethod: true,
      thrBudgetBaseCodes: true, thrEligibilityMonths: true, thrProrateRoundDays: true,
    },
  });
  const taxConfig = await loadTaxConfig();

  const where = { salaryTemplateHeaderId: { not: null } };
  if (employeeIds && employeeIds.length) where.id = { in: employeeIds.map(Number) };
  const employees = await prisma.users.findMany({ where, select: { id: true, fullName: true } });

  let processed = 0;
  const failures = [];
  for (const emp of employees) {
    try {
      const built = await persistPayslip({
        usersId: emp.id,
        cutoffPeriodId: run.cutOffPeriodId,
        createdBy,
        setup,
        taxConfig,
        payrollRunId: run.id,
      });
      processed++;
      const thp = built.details
        .filter((d) => d.isTakeHomePay === 1)
        .reduce((a, d) => a + (d.category === 'Earnings' ? d.amount : -d.amount), 0);
      const pphRow = built.details.find((d) => d.code === 'TD' && d.category === 'Deductions');
      await prisma.payrollRunDetail.upsert({
        where: { payrollRunId_usersId: { payrollRunId: run.id, usersId: emp.id } },
        create: {
          payrollRunId: run.id, usersId: emp.id, fullName: emp.fullName,
          status: 'OK', grossAmount: built.totals.brutto,
          deductionAmount: built.totals.deductionsThp,
          thpAmount: Math.round(thp), pph21Amount: pphRow ? pphRow.amount : 0,
          createdBy, updatedBy: createdBy,
        },
        update: {
          status: 'OK', errorMessage: null, fullName: emp.fullName,
          grossAmount: built.totals.brutto,
          deductionAmount: built.totals.deductionsThp,
          thpAmount: Math.round(thp), pph21Amount: pphRow ? pphRow.amount : 0,
          updatedBy: createdBy,
        },
      });
    } catch (err) {
      failures.push(`${emp.fullName}: ${err.message}`);
      await prisma.payrollRunDetail.upsert({
        where: { payrollRunId_usersId: { payrollRunId: run.id, usersId: emp.id } },
        create: {
          payrollRunId: run.id, usersId: emp.id, fullName: emp.fullName,
          status: 'FAILED', errorMessage: String(err.message).slice(0, 300),
          createdBy, updatedBy: createdBy,
        },
        update: {
          status: 'FAILED', errorMessage: String(err.message).slice(0, 300),
          updatedBy: createdBy,
        },
      }).catch(() => {});
    }
  }

  await prisma.payrollRun.update({ where: { id: run.id }, data: { updatedBy: createdBy } });
  return { runId: run.id, processed, failed: failures.length, failures };
}

/** Transisi status run: submit / approve / lock / backToDraft. */
async function transitionRun({ runId, action, actor, note = null }) {
  const run = await prisma.payrollRun.findUnique({ where: { id: Number(runId) } });
  if (!run) throw new Error('Payroll run tidak ditemukan');
  const to = assertTransition(run.status, action);

  if (action === 'submit') {
    const okCount = await prisma.payrollRunDetail.count({ where: { payrollRunId: run.id, status: 'OK' } });
    if (okCount < 1) throw new Error('Tidak bisa submit: run belum memiliki payslip (generate dulu)');
  }

  const stampData = {
    DRAFT:     {},
    SUBMITTED: { submittedBy: actor, submittedAt: new Date() },
    APPROVED:  { approvedBy: actor, approvedAt: new Date() },
    LOCKED:    { lockedBy: actor, lockedAt: new Date() },
  }[to];

  return prisma.payrollRun.update({
    where: { id: run.id },
    data: { status: to, note: note ?? run.note, ...stampData },
  });
}

/** Ringkasan run untuk halaman detail. */
async function getRunSummary(runId) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: Number(runId) },
    include: {
      cutOffPeriod: { select: { id: true, uuid: true, monthPeriod: true, yearPeriod: true, startPeriod: true, endPeriod: true, workDays: true, isClosing: true } },
      runDetail: { orderBy: [{ status: 'asc' }, { fullName: 'asc' }] },
    },
  });
  if (!run) return null;

  const totals = run.runDetail.reduce((a, d) => ({
    gross: a.gross + Number(d.status === 'OK' ? d.grossAmount : 0),
    deduction: a.deduction + Number(d.status === 'OK' ? d.deductionAmount : 0),
    thp: a.thp + Number(d.status === 'OK' ? d.thpAmount : 0),
    pph21: a.pph21 + Number(d.status === 'OK' ? d.pph21Amount : 0),
  }), { gross: 0, deduction: 0, thp: 0, pph21: 0 });

  return {
    run,
    counts: {
      total: run.runDetail.length,
      ok: run.runDetail.filter((d) => d.status === 'OK').length,
      failed: run.runDetail.filter((d) => d.status === 'FAILED').length,
    },
    totals,
  };
}

module.exports = {
  TRANSITIONS,
  assertTransition,
  assertRunWritable,
  getOrCreateRun,
  generateRunEmployees,
  transitionRun,
  getRunSummary,
};
