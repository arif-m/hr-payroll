/**
 * smoke-test-payroll-run.js — uji lifecycle PayrollRun pada DB dev (REVERSIBLE):
 *   buat run DRAFT → generate → submit → (guard: edit ditolak) → backToDraft
 *   → submit → approve → lock → (guard: edit ditolak) → verifikasi snapshot
 *   → bersihkan semua data uji.
 * Jalankan: node scripts/smoke-test-payroll-run.js
 */
const prisma = require('../libs/prisma');
const { getOrCreateRun, generateRunEmployees, transitionRun } = require('../libs/payroll/run');
const { persistPayslip } = require('../libs/payroll/persist');
const { loadTaxConfig } = require('../libs/payroll/config');
const { buildPaymentFile } = require('../libs/payroll/payment-file');
const MARK = 'SMOKE-TEST-DO-NOT-USE';
let originalSalaries = []; // snapshot gaji asli karyawan uji (dipulihkan di cleanup)

async function main() {
  // --- 1. Data uji ----------------------------------------------------------
  let period = await prisma.cutOffPeriod.findFirst({ where: { monthPeriod: '09', yearPeriod: '2026' } });
  let periodCreatedByTest = false;
  if (!period) {
    period = await prisma.cutOffPeriod.create({
      data: {
        monthPeriod: '09', yearPeriod: '2026',
        startPeriod: new Date('2026-09-01'), endPeriod: new Date('2026-09-30'),
        workDays: 20, createdBy: MARK, updatedBy: MARK,
      },
    });
    periodCreatedByTest = true;
  }

  const salaryTemplate = await prisma.salaryTemplateHeader.findFirst({ where: { templateName: 'Standard' } });
  const user = await prisma.users.findFirst({ orderBy: { id: 'asc' } });
  const prevTemplateId = user.salaryTemplateHeaderId;
  const prevBank = { bankName: user.bankName, bankAccountNumber: user.bankAccountNumber, bankAccountHolder: user.bankAccountHolder };
  await prisma.users.update({
    where: { id: user.id },
    data: {
      salaryTemplateHeaderId: salaryTemplate.id, npwp: user.npwp || '000000000000000',
      bankName: 'BCA', bankAccountNumber: '1234567890', bankAccountHolder: user.fullName.toUpperCase(),
    },
  });
  // Simpan gaji asli SEBELUM dihapus — dipulihkan di cleanup (crash-safe).
  originalSalaries = await prisma.usersSalary.findMany({ where: { usersId: user.id } });
  await prisma.usersSalary.deleteMany({ where: { usersId: user.id } });
  await prisma.usersSalary.create({
    data: {
      usersId: user.id, componentId: 1, componentCode: 'BS', componentName: 'Basic Salary',
      salaryComponentTypeId: 7, salaryComponentTypeName: 'Fixed',
      salaryComponentCategoryId: 1, salaryComponentCategoryName: 'Earnings',
      amount: 10000000, isTakeHomePay: 1, sequence: 100, createdBy: MARK, updatedBy: MARK,
    },
  });

  // --- 2. Run DRAFT + generate ----------------------------------------------
  const run = await getOrCreateRun(period.id, 'smoke-test');
  console.log(`Run #${run.id} status=${run.status} (harus DRAFT)`);
  if (run.status !== 'DRAFT') throw new Error('Run baru bukan DRAFT');

  const gen = await generateRunEmployees({ runId: run.id, createdBy: 'smoke-test' });
  console.log(`Generate: processed=${gen.processed} failed=${gen.failed}`);
  if (gen.processed < 1) throw new Error('Tidak ada karyawan terproses: ' + gen.failures.join('; '));

  const detail = await prisma.payrollRunDetail.findUnique({
    where: { payrollRunId_usersId: { payrollRunId: run.id, usersId: user.id } },
  });
  console.log(`Detail karyawan uji: status=${detail.status} bruto=${detail.grossAmount} pph21=${detail.pph21Amount} thp=${detail.thpAmount}`);
  if (detail.status !== 'OK') throw new Error('Detail run FAILED: ' + detail.errorMessage);

  const headerAfterGen = await prisma.payslipHeader.findFirst({
    where: { usersId: user.id, monthPeriod: '09', yearPeriod: '2026' },
  });
  if (headerAfterGen.payrollRunId !== run.id) throw new Error('payslipHeader.payrollRunId tidak tersambung ke run');
  if (!headerAfterGen.taxConfigSnapshot) throw new Error('Snapshot tarif tidak ada di payslip');

  // JKP 0,46% (info-only): harus muncul di payslip = 0,46% × 10.000.000 = 46.000
  const jkpRow = await prisma.payslipDetails.findFirst({
    where: { code: 'JKP', payslip: { usersId: user.id, monthPeriod: '09', yearPeriod: '2026' } },
  });
  if (!jkpRow) throw new Error('Baris JKP tidak ada di payslip (template BPJS TK belum punya JKP?)');
  if (Number(jkpRow.amount) !== 46000) throw new Error(`JKP amount salah: ${jkpRow.amount} (harusnya 46000)`);
  console.log(`JKP OK: baris info 0,46% = ${jkpRow.amount} (tidak mengubah THP/PPh)`);

  // Guard: payment file ditolak saat run belum APPROVED/LOCKED
  let pfRejected = false;
  try { await buildPaymentFile(run.id); }
  catch (e) { pfRejected = true; console.log(`Guard OK: payment file saat DRAFT ditolak — "${e.message}"`); }
  if (!pfRejected) throw new Error('GAGAL: payment file bisa dibuat saat run DRAFT');

  // --- 3. Submit → edit harus ditolak ---------------------------------------
  await transitionRun({ runId: run.id, action: 'submit', actor: 'smoke-test' });
  console.log('Submit → SUBMITTED');
  let rejected = false;
  try {
    await persistPayslip({ usersId: user.id, cutoffPeriodId: period.id, createdBy: 'smoke-test', taxConfig: await loadTaxConfig() });
  } catch (e) { rejected = true; console.log(`Guard OK: edit saat SUBMITTED ditolak — "${e.message}"`); }
  if (!rejected) throw new Error('GAGAL: payslip bisa ditulis saat run SUBMITTED (guard bocor)');

  // --- 4. backToDraft → edit boleh lagi → submit → approve → lock ------------
  await transitionRun({ runId: run.id, action: 'backToDraft', actor: 'smoke-test', note: 'koreksi uji' });
  console.log('backToDraft → DRAFT (note tersimpan)');
  await persistPayslip({ usersId: user.id, cutoffPeriodId: period.id, createdBy: 'smoke-test', taxConfig: await loadTaxConfig() });
  console.log('Edit saat DRAFT: OK');

  await transitionRun({ runId: run.id, action: 'submit', actor: 'smoke-test' });
  await transitionRun({ runId: run.id, action: 'approve', actor: 'smoke-test' });
  console.log('approve → APPROVED');

  // Payment file di status APPROVED harus bisa dibuat & isinya benar
  const pf = await buildPaymentFile(run.id);
  if (pf.count !== 1) throw new Error(`Payment file baris = ${pf.count} (harusnya 1)`);
  const expectLine = `BCA,1234567890,${user.fullName.toUpperCase()},${user.fullName},${user.employeeId}`;
  if (!pf.csv.includes(expectLine)) throw new Error(`Payment file baris tidak cocok. Isi:\n${pf.csv}`);
  console.log(`Payment file OK: 1 baris, total THP ${pf.totalAmount}`);

  await transitionRun({ runId: run.id, action: 'lock', actor: 'smoke-test' });
  console.log('lock → LOCKED');

  rejected = false;
  try {
    await persistPayslip({ usersId: user.id, cutoffPeriodId: period.id, createdBy: 'smoke-test', taxConfig: await loadTaxConfig() });
  } catch (e) { rejected = true; console.log(`Guard OK: edit saat LOCKED ditolak — "${e.message}"`); }
  if (!rejected) throw new Error('GAGAL: payslip bisa ditulis saat run LOCKED (guard bocor)');

  // Transisi liar ditolak
  let invalidRejected = false;
  try { await transitionRun({ runId: run.id, action: 'submit', actor: 'smoke-test' }); }
  catch (e) { invalidRejected = true; }
  if (!invalidRejected) throw new Error('GAGAL: transisi submit pada run LOCKED tidak ditolak');
  console.log('Guard OK: transisi liar ditolak');

  console.log('\nSMOKE TEST PAYROLL RUN: PASS');
  return { runId: run.id, userId: user.id, prevTemplateId, prevBank, periodCreatedByTest, periodId: period.id };
}

/** Pulihkan kondisi DB: payslip uji, gaji asli, template/bank, periode uji. */
async function cleanup(ctx) {
  await prisma.payslipDetails.deleteMany({ where: { createdBy: 'smoke-test' } }).catch(() => {});
  await prisma.payslipHeader.deleteMany({ where: { createdBy: 'smoke-test' } }).catch(() => {});
  if (ctx && ctx.runId) {
    await prisma.payrollRunDetail.deleteMany({ where: { payrollRunId: ctx.runId } }).catch(() => {});
    await prisma.payslipHeader.deleteMany({ where: { payrollRunId: ctx.runId } }).catch(() => {});
    await prisma.payrollRun.deleteMany({ where: { id: ctx.runId } }).catch(() => {});
  }
  await prisma.usersSalary.deleteMany({ where: { createdBy: MARK } }).catch(() => {});
  if (ctx && ctx.userId != null) {
    await prisma.usersSalary.deleteMany({ where: { usersId: ctx.userId } }).catch(() => {});
    for (const s of (originalSalaries || [])) {
      const { id, uuid, createdAt, updatedAt, user: _u, componentTypes: _ct, componentCategories: _cc, ...data } = s;
      await prisma.usersSalary.create({ data }).catch((e) => console.error('restore salary:', e.message));
    }
    await prisma.users.update({ where: { id: ctx.userId }, data: { salaryTemplateHeaderId: ctx.prevTemplateId, bankName: ctx.prevBank.bankName, bankAccountNumber: ctx.prevBank.bankAccountNumber, bankAccountHolder: ctx.prevBank.bankAccountHolder } }).catch((e) => console.error('restore user:', e.message));
  }
  if (ctx && ctx.periodCreatedByTest && ctx.periodId) {
    await prisma.cutOffPeriod.deleteMany({ where: { id: ctx.periodId } }).catch(() => {});
  }
  console.log('Cleanup selesai — DB kembali seperti semula.');
}

let cleaned = false;

main()
  .then(async (ctx) => {
    await cleanup(ctx);
    cleaned = true;
  })
  .catch((e) => { console.error('SMOKE TEST PAYROLL RUN: FAIL —', e.message); process.exitCode = 1; })
  .finally(async () => {
    // Crash-safe: pulihkan gaji asli walau main() gagal sebelum cleanup.
    // (Bila .then sudah cleanup, jangan cleanup lagi — akan menghapus hasil restore.)
    if (!cleaned) {
      try {
        const user = await prisma.users.findFirst({ orderBy: { id: 'asc' }, select: { id: true } });
        await cleanup({ userId: user ? user.id : null, prevTemplateId: null, prevBank: {} });
      } catch (e) { console.error('RESTORE ERROR:', e.message); process.exitCode = 1; }
    }
    await prisma.$disconnect();
  });
