/**
 * smoke-test-thr-email.js — verifikasi end-to-end THR + email payslip.
 * Reversible: semua data uji dihapus di finally (pola smoke test riwayat).
 * Jalankan dengan MySQL hidup: node scripts/smoke-test-thr-email.js
 *
 * Alur:
 *  1. Buat cutOffPeriod uji (isThr=1) + run DRAFT → generateRunEmployees
 *  2. Assert baris THR di payslip (= basis BS, masa kerja ≥12 bln) + THP run
 *  3. Submit → Approve → kirim email dengan transporter MOCK (dry-run)
 *  4. Assert EmailLog tercatat SENT + dedup (kirim ulang → SKIPPED)
 *  5. Cleanup: run/detail/payslip/details/emailLog/periode uji dihapus
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getOrCreateRun, generateRunEmployees, transitionRun } = require('../libs/payroll/run');
const { sendPayslipsForRun } = require('../libs/payroll/email-payslip');

const ACTOR = 'smoke-thr-email';
const MARK = `smoke-thr-${Date.now()}`;

// Transporter mock: tidak mengirim email sungguhan, hanya mencatat.
function mockTransporter() {
  const sent = [];
  return {
    _sent: sent,
    async sendMail(opts) { sent.push({ to: opts.to, subject: opts.subject }); },
  };
}

async function main(ctx = {}) {
  // Pre-clean mandiri: sisa data uji dari run yang gagal sebelum cleanup.
  const stale = await prisma.cutOffPeriod.findMany({ where: { createdBy: ACTOR } });
  for (const sp of stale) {
    const runIds = (await prisma.payrollRun.findMany({ where: { cutOffPeriodId: sp.id }, select: { id: true } })).map((r) => r.id);
    const headerIds = (await prisma.payslipHeader.findMany({ where: { OR: [{ cutOffPeriodId: sp.id }, { payrollRunId: { in: runIds } }] }, select: { id: true } })).map((h) => h.id);
    for (const h of headerIds) {
      await prisma.emailLog.deleteMany({ where: { payslipHeaderId: h.id } }).catch((e) => console.error('preclean emailLog:', e.message));
      await prisma.payslipDetails.deleteMany({ where: { payslipHeaderId: h.id } }).catch((e) => console.error('preclean details:', e.message));
    }
    await prisma.payslipHeader.deleteMany({ where: { id: { in: headerIds } } }).catch((e) => console.error('preclean header:', e.message));
    await prisma.payrollRunDetail.deleteMany({ where: { payrollRunId: { in: runIds } } }).catch((e) => console.error('preclean runDetail:', e.message));
    await prisma.payrollRun.deleteMany({ where: { id: { in: runIds } } }).catch((e) => console.error('preclean run:', e.message));
    await prisma.cutOffPeriod.deleteMany({ where: { id: sp.id } }).catch((e) => console.error('preclean period:', e.message));
  }
  if (stale.length) console.log(`Pre-clean: ${stale.length} periode uji sisa dibersihkan`);

  console.log(`MARK: ${MARK}`);
  // --- 0. Data awal ---------------------------------------------------------
  const emp = await prisma.users.findFirst({
    where: { status: 'Active', salaryTemplateHeaderId: { not: null } },
    select: { id: true, fullName: true, email: true, joinDate: true },
  });
  if (!emp) throw new Error('Butuh minimal 1 karyawan aktif dengan template gaji');
  const bs = await prisma.usersSalary.findFirst({
    where: { usersId: emp.id, componentCode: 'BS' }, select: { amount: true },
  });
  const setup = await prisma.setupSystem.findFirst({
    select: {
      defaultTaxMethod: true, taxRegime: true, taxCalculationMethod: true,
      thrBudgetBaseCodes: true, thrEligibilityMonths: true, thrProrateRoundDays: true,
    },
  });
  console.log(`Karyawan uji: ${emp.fullName} (BS ${bs ? Number(bs.amount) : 0}, email ${emp.email || '-'})`);

  // --- 1. Periode uji bertanda THR + run ------------------------------------
  // Tahun join+beberapa: masa kerja ≥12 bln DAN gaji sekarang = gaji efektif
  // saat THR (tidak ada perubahan ber-tanggal di masa depan).
  const year = new Date().getFullYear() + 10;
  const period = await prisma.cutOffPeriod.create({
    data: {
      monthPeriod: '04', yearPeriod: String(year), isActive: 0,
      startPeriod: new Date(Date.UTC(year, 3, 1)),
      endPeriod: new Date(Date.UTC(year, 3, 30)),
      workDays: 20, isClosing: 0, isThr: 1,
      createdBy: ACTOR, updatedBy: ACTOR,
    },
  });
  ctx.periodId = period.id;
  const run = await getOrCreateRun(period.id, ACTOR);
  ctx.runId = run.id;
  const gen = await generateRunEmployees({ runId: run.id, employeeIds: [emp.id], createdBy: ACTOR });
  console.log(`Generate: processed=${gen.processed} failed=${gen.failed}${gen.failures.length ? ' → ' + gen.failures.join('; ') : ''}`);
  if (gen.failed > 0) throw new Error('Generate gagal: ' + gen.failures.join('; '));

  // --- 2. Assert payslip berisi THR ------------------------------------------
  const detail = await prisma.payrollRunDetail.findFirst({
    where: { payrollRunId: run.id, usersId: emp.id },
  });
  if (!detail || detail.status !== 'OK') throw new Error('RunDetail tidak OK');
  const header = await prisma.payslipHeader.findFirst({
    where: { usersId: emp.id, monthPeriod: '04', yearPeriod: String(year) },
  });
  ctx.headerId = header.id;
  const thrRow = await prisma.payslipDetails.findFirst({
    where: { payslipHeaderId: header.id, code: 'THR' },
  });
  const pphRow = await prisma.payslipDetails.findFirst({
    where: { payslipHeaderId: header.id, code: 'TD' },
  });
  const bsAmount = Number(bs.amount);
  if (!thrRow) throw new Error('Baris THR tidak ada di payslip');
  if (Number(thrRow.amount) !== bsAmount) {
    throw new Error(`THR ${Number(thrRow.amount)} ≠ basis BS ${bsAmount}`);
  }
  if (Number(pphRow.amount) <= 0) throw new Error('PPh 21 tidak terhitung (THR harus ikut basis TER)');
  console.log(`Payslip OK: THR=${Number(thrRow.amount)}, PPh21=${Number(pphRow.amount)}, THP=${detail.thpAmount}`);
  const thpTanpaThr = detail.thpAmount - Number(thrRow.amount);

  // --- 3. Workflow + email (mock) ---------------------------------------------
  await transitionRun({ runId: run.id, action: 'submit', actor: ACTOR });
  await transitionRun({ runId: run.id, action: 'approve', actor: ACTOR });
  const tx = mockTransporter();
  const result = await sendPayslipsForRun(run.id, ACTOR, { transporter: tx });
  console.log(`Email: total=${result.total} sent=${result.sent} skipped=${result.skipped} failed=${result.failed}`);
  if (result.sent !== 1) throw new Error('Email payslip tidak terkirim (mock)');
  if (!tx._sent[0].subject.includes(emp.fullName)) throw new Error('Subjek email tidak memuat nama karyawan');
  if (!emp.email || tx._sent[0].to !== emp.email) throw new Error('Penerima email salah');

  const log = await prisma.emailLog.findFirst({
    where: { payslipHeaderId: header.id, status: 'SENT' },
  });
  if (!log) throw new Error('EmailLog SENT tidak tercatat');

  // --- 4. Dedup: kirim ulang → SKIPPED ----------------------------------------
  const again = await sendPayslipsForRun(run.id, ACTOR, { transporter: mockTransporter() });
  if (again.sent !== 0 || again.skipped !== 1) {
    throw new Error(`Dedup gagal: sent=${again.sent} skipped=${again.skipped}`);
  }
  console.log('Dedup OK: kirim ulang dilewati (SKIPPED)');

  // --- 5. Guard status: run DRAFT terpisah → email harus ditolak --------------
  const period2 = await prisma.cutOffPeriod.create({
    data: {
      monthPeriod: '05', yearPeriod: String(year), isActive: 0,
      startPeriod: new Date(Date.UTC(year, 4, 1)),
      endPeriod: new Date(Date.UTC(year, 4, 31)),
      workDays: 20, isClosing: 0, isThr: 0,
      createdBy: ACTOR, updatedBy: ACTOR,
    },
  });
  ctx.period2Id = period2.id;
  const runDraft = await getOrCreateRun(period2.id, ACTOR); // status DRAFT
  ctx.run2Id = runDraft.id;
  try {
    await sendPayslipsForRun(runDraft.id, ACTOR, { transporter: mockTransporter() });
    throw new Error('Guard gagal: email terkirim saat DRAFT');
  } catch (e) {
    if (!/APPROVED\/LOCKED/.test(e.message)) throw e;
    console.log('Guard OK: email ditolak saat DRAFT');
  }

  console.log('\nSEMUA ASSERT PASS ✅');
  console.log(`Ringkasan: THR=${Number(thrRow.amount)} (1× BS), PPh21 ikut naik, THP tanpa THR=${thpTanpaThr}`);
  return { periodId: period.id, runId: run.id, headerId: header.id, period2Id: ctx.period2Id, run2Id: ctx.run2Id };
}

async function cleanup(ctx = {}) {
  const { periodId, runId, headerId, period2Id, run2Id } = ctx;
  // Hapus anak dulu → induk. EmailLog sebelum payslip, dst.
  if (headerId) {
    await prisma.emailLog.deleteMany({ where: { payslipHeaderId: headerId } }).catch(() => {});
    await prisma.payslipDetails.deleteMany({ where: { payslipHeaderId: headerId } }).catch(() => {});
  }
  if (runId) {
    await prisma.payslipHeader.deleteMany({ where: { payrollRunId: runId } }).catch(() => {});
    await prisma.payrollRunDetail.deleteMany({ where: { payrollRunId: runId } }).catch(() => {});
    await prisma.payrollRun.deleteMany({ where: { id: runId } }).catch(() => {});
  }
  if (headerId) {
    await prisma.payslipHeader.deleteMany({ where: { id: headerId } }).catch(() => {});
  }
  if (periodId) {
    await prisma.cutOffPeriod.deleteMany({ where: { id: periodId } }).catch(() => {});
  }
  if (run2Id) {
    await prisma.payrollRunDetail.deleteMany({ where: { payrollRunId: run2Id } }).catch(() => {});
    await prisma.payslipHeader.deleteMany({ where: { payrollRunId: run2Id } }).catch(() => {});
    await prisma.payrollRun.deleteMany({ where: { id: run2Id } }).catch(() => {});
  }
  if (period2Id) {
    await prisma.cutOffPeriod.deleteMany({ where: { id: period2Id } }).catch(() => {});
  }
  console.log('Cleanup selesai — DB kembali seperti semula');
}

(async () => {
  const ctx = {};
  try {
    await main(ctx);
  } catch (e) {
    console.error('GAGAL:', e.message);
    process.exitCode = 1;
  } finally {
    try { await cleanup(ctx); } catch (e) { console.error('CLEANUP ERROR:', e.message); process.exitCode = 1; }
    await prisma.$disconnect();
  }
})();
