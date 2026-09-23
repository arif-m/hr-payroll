/**
 * persist.js — penulisan hasil engine ke DB dalam satu transaksi.
 * Idempotent per (usersId, monthPeriod, yearPeriod): payslip lama dihapus
 * lalu dibuat ulang. Dipakai controller generate-salary dan smoke test.
 */
const prisma = require('../prisma');
const { buildPayslip } = require('./engine');

/**
 * Guard: bila periode sudah memiliki payroll run berstatus
 * SUBMITTED/APPROVED/LOCKED, TIDAK ADA payslip periode itu yang boleh ditulis
 * dari jalur manapun — berbasis run-per-periode (bukan relasi header), sehingga
 * tidak bisa dilewati dengan me-regenerate header tanpa runId.
 * Didefinisikan di sini (bukan di run.js) agar bebas circular dependency.
 */
async function assertPeriodWritable(cutoffPeriodId) {
  const run = await prisma.payrollRun.findUnique({
    where: { cutOffPeriodId: Number(cutoffPeriodId) },
    select: { status: true },
  });
  if (run && run.status !== 'DRAFT') {
    throw new Error(`Payroll run periode ini berstatus ${run.status} — payslip tidak bisa digenerate/dikoreksi lagi`);
  }
}

/**
 * Bangun + tulis payslip satu karyawan untuk satu periode.
 * @returns {Object} hasil buildPayslip ({ header, details, totals })
 */
async function persistPayslip({ usersId, cutoffPeriodId, createdBy, setup, taxConfig, payrollRunId = null }) {
  const cutoffPeriod = await prisma.cutOffPeriod.findFirst({
    where: { id: Number(cutoffPeriodId) },
  });
  if (!cutoffPeriod) throw new Error('Periode cut-off tidak ditemukan');
  if (cutoffPeriod.isClosing === 1) {
    throw new Error('Periode sudah di-closing dan tidak bisa diubah');
  }

  // Guard: periode dengan run non-DRAFT terkunci total.
  await assertPeriodWritable(cutoffPeriodId);

  // Retensi: bila payslip lama ter-attach ke sebuah run, tulis-ulang tetap
  // terhubung ke run yang sama (kecuali caller menentukan run lain).
  const existingHeader = await prisma.payslipHeader.findFirst({
    where: { usersId, monthPeriod: cutoffPeriod.monthPeriod, yearPeriod: cutoffPeriod.yearPeriod },
    select: { payrollRunId: true },
  });

  const built = await buildPayslip({
    usersId, cutoffPeriod, createdBy,
    setupSystem: setup,
    taxConfig: taxConfig || null,
  });
  const { header, details } = built;

  await prisma.$transaction(async (tx) => {
    await tx.payslipDetails.deleteMany({
      where: { payslip: { usersId, monthPeriod: header.monthPeriod, yearPeriod: header.yearPeriod } },
    });
    await tx.payslipHeader.deleteMany({
      where: { usersId, monthPeriod: header.monthPeriod, yearPeriod: header.yearPeriod },
    });
    const created = await tx.payslipHeader.create({ data: { ...header, payrollRunId: payrollRunId ?? existingHeader?.payrollRunId ?? null } });
    await tx.payslipDetails.createMany({
      data: details.map((d) => ({ ...d, payslipHeaderId: created.id, createdBy, updatedBy: createdBy })),
    });
  });

  return built;
}

module.exports = { persistPayslip, assertPeriodWritable };
