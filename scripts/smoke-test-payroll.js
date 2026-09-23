let originalSalaries = [];

/**
 * smoke-test-payroll.js — uji end-to-end engine pada DB dev (REVERSIBLE):
 *  1. Buat periode cutoff + setup gaji karyawan uji (BS Fixed 10jt).
 *  2. Jalankan persistPayslip (engine lengkap: prorata, BPJS, TER gross-up).
 *  3. Verifikasi hasil & idempotensi (re-run tidak menduplikasi).
 *  4. Bersihkan semua data uji.
 * Jalankan: node scripts/smoke-test-payroll.js
 */
require('dotenv').config();
const prisma = require('../libs/prisma');
const { persistPayslip } = require('../libs/payroll/persist');
const { replayPayslip } = require('../libs/payroll/replay');
const MARK = 'SMOKE-TEST-DO-NOT-USE';

async function main() {
  const setup = await prisma.setupSystem.findFirst({
    select: { defaultTaxMethod: true, taxRegime: true },
  });
  console.log(`SetupSystem: taxRegime=${setup && setup.taxRegime} method=${setup && setup.defaultTaxMethod}`);

  // --- 1. Data uji ---------------------------------------------------------
  let period = await prisma.cutOffPeriod.findFirst({
    where: { monthPeriod: '09', yearPeriod: '2026' },
  });
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
  if (period.isClosing === 1) throw new Error('Periode uji 09/2026 sudah closing — pilih periode lain');

  const salaryTemplate = await prisma.salaryTemplateHeader.findFirst({ where: { templateName: 'Standard' } });
  if (!salaryTemplate) throw new Error('SalaryTemplateHeader "Standard" tidak ada — jalankan seed dulu');

  const user = await prisma.users.findFirst({ orderBy: { id: 'asc' } });
  await prisma.users.update({
    where: { id: user.id },
    data: { salaryTemplateHeaderId: salaryTemplate.id, npwp: user.npwp || '000000000000000' },
  });
  // Simpan gaji asli SEBELUM dihapus — dipulihkan di finally (crash-safe).
  originalSalaries = await prisma.usersSalary.findMany({ where: { usersId: user.id } });
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
  console.log(`Karyawan uji: id=${user.id} ${user.fullName} | Periode: Sep-2026 (20 hari kerja)`);

  // --- 2. Jalankan engine ---------------------------------------------------
  const built = await persistPayslip({
    usersId: user.id,
    cutoffPeriodId: period.id,
    createdBy: 'smoke-test',
    setup,
  });

  console.log('\n--- PayslipDetails ---');
  for (const d of built.details) {
    console.log(
      `${String(d.sequence).padStart(5)} | ${d.category.padEnd(10)} | ${d.name.padEnd(32)} ` +
      `| THP=${d.isTakeHomePay} TAX=${d.isTaxBase} | Rp ${Number(d.amount).toLocaleString('id-ID')}`
    );
  }
  console.log(`\nTotals: brutto=${built.totals.brutto.toLocaleString('id-ID')} deductionsThp=${built.totals.deductionsThp.toLocaleString('id-ID')}`);

  const thp = built.details
    .filter((d) => d.isTakeHomePay === 1)
    .reduce((acc, d) => acc + (d.category === 'Earnings' ? Number(d.amount) : -Number(d.amount)), 0);
  console.log(`Take Home Pay (hitung dari details): Rp ${thp.toLocaleString('id-ID')}`);

  // --- 3. Idempotensi -------------------------------------------------------
  await persistPayslip({ usersId: user.id, cutoffPeriodId: period.id, createdBy: 'smoke-test', setup });
  const headerCount = await prisma.payslipHeader.count({
    where: { usersId: user.id, monthPeriod: '09', yearPeriod: '2026' },
  });
  console.log(`\nIdempotensi: re-run → payslipHeader count = ${headerCount} (harus 1)`);
  if (headerCount !== 1) throw new Error('GAGAL: re-run menduplikasi payslip');

  // --- 3b. Snapshot tarif & replay -----------------------------------------
  const savedHeader = await prisma.payslipHeader.findFirst({
    where: { usersId: user.id, monthPeriod: '09', yearPeriod: '2026' },
  });
  if (!savedHeader.taxConfigSnapshot) throw new Error('GAGAL: taxConfigSnapshot tidak tersimpan di header');
  const snap = savedHeader.taxConfigSnapshot;
  console.log(
    `Snapshot tarif: TER ${Object.keys(snap.terTables || {}).join('/')}` +
    ` | Pasal17 ${(snap.pasal17 || []).length} lapisan` +
    ` | PTKP ${snap.ptkpAmounts ? Object.keys(snap.ptkpAmounts).length + ' kode' : 'fallback'}` +
    ` | BiayaJabatan ${snap.biayaJabatanRate}% cap ${snap.biayaJabatanMaxMonthly}` +
    ` | NPWP +${snap.npwpSurchargePercent}%`
  );

  const replay = await replayPayslip({ usersId: user.id, monthPeriod: '09', yearPeriod: '2026' });
  console.log(
    `Replay dari snapshot: PPh stored=${replay.storedPph} vs recalc=${replay.recalculatedPph}` +
    ` | THP stored=${replay.storedThp} vs recalc=${replay.recalculatedThp} → ${replay.ok ? 'MATCH' : 'SELISIH!'}`
  );
  if (!replay.ok) throw new Error('GAGAL: replay dari snapshot tidak cocok dengan payslip tersimpan');

  // --- 4. Cleanup (dipanggil dari finally agar selalu jalan) -----------------
  await restoreState({ userId: user.id, periodId: period.id, periodCreatedByTest });
  console.log('Cleanup selesai — DB kembali seperti semula.');
  console.log('\nSMOKE TEST: PASS');
}

/** Pulihkan kondisi DB: payslip uji, gaji asli, template, periode uji. */
async function restoreState({ userId, periodId, periodCreatedByTest }) {
  await prisma.payslipDetails.deleteMany({ where: { createdBy: 'smoke-test' } }).catch(() => {});
  await prisma.payslipHeader.deleteMany({ where: { createdBy: 'smoke-test' } }).catch(() => {});
  await prisma.usersSalary.deleteMany({ where: { createdBy: MARK } }).catch(() => {});
  if (periodCreatedByTest) {
    await prisma.cutOffPeriod.deleteMany({ where: { id: periodId } }).catch(() => {});
  }
  // Pulihkan gaji asli: hapus SEMUA gaji karyawan uji (termasuk sisa BS smoke
  // bila main gagal sebelum cleanup), lalu recreate dari snapshot asli.
  if (typeof userId !== 'undefined' && userId !== null) {
    await prisma.usersSalary.deleteMany({ where: { usersId: userId } }).catch(() => {});
    if (originalSalaries && originalSalaries.length) {
      for (const s of originalSalaries) {
        const { id, uuid, createdAt, updatedAt, user: _u, componentTypes: _ct, componentCategories: _cc, ...data } = s;
        await prisma.usersSalary.create({ data }).catch((e) => console.error('restore salary:', e.message));
      }
    }
  }
}

main()
  .catch((e) => { console.error('SMOKE TEST: FAIL —', e.message); process.exitCode = 1; })
  .finally(async () => {
    // Crash-safe: pulihkan state walau main() gagal di tengah jalan.
    try {
      const user = await prisma.users.findFirst({ orderBy: { id: 'asc' }, select: { id: true } });
      await restoreState({ userId: user ? user.id : null, periodId: null, periodCreatedByTest: false });
      console.log('State DB dipulihkan (finally).');
    } catch (e) { console.error('RESTORE ERROR:', e.message); process.exitCode = 1; }
    await prisma.$disconnect();
  });
