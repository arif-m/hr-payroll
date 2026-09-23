/**
 * Unit test mesin PPh 21 — node:test (bawaan Node, tanpa dependency).
 * Vektor diambil dari aturan PMK 168/2023 (TER) dan Pasal 17 UU HPP.
 * Jalankan: npm test
 */
const test = require('node:test');
const assert = require('node:assert');
const tax21 = require('../libs/payroll/tax21');
const bpjs = require('../libs/payroll/bpjs');
const { roundToThousandDown, prorate } = require('../libs/payroll/money');
const runState = require('../libs/payroll/run-state');
const { reconstructAt } = require('../libs/payroll/employment-history');

// ---------------------------------------------------------------------------
// Tarif progresif Pasal 17
// ---------------------------------------------------------------------------
test('progresif: PKP 60jt = 5% penuh = 3.000.000', () => {
  assert.strictEqual(tax21.progressiveAnnualTax(60000000), 3000000);
});

test('progresif: PKP 100jt = (60jt×5%)+(40jt×15%) = 9.000.000', () => {
  assert.strictEqual(tax21.progressiveAnnualTax(100000000), 9000000);
});

test('progresif: PKP 300jt lapisan benar semua', () => {
  // 60jt×5% + 190jt×15% + 50jt×25% = 3jt + 28,5jt + 12,5jt = 44jt
  assert.strictEqual(tax21.progressiveAnnualTax(300000000), 44000000);
});

test('progresif: PKP 6miliar mencakup lapisan 30% & 35%', () => {
  // 3jt + 28,5jt + 62,5jt + 4,5m×30% + 1m×35% = 1.794.000.000
  assert.strictEqual(tax21.progressiveAnnualTax(6000000000), 1794000000);
});

test('progresif: PKP 0 dan negatif = 0', () => {
  assert.strictEqual(tax21.progressiveAnnualTax(0), 0);
  assert.strictEqual(tax21.progressiveAnnualTax(-1000), 0);
});

// ---------------------------------------------------------------------------
// TER bulanan
// ---------------------------------------------------------------------------
test('TER A: bruto 4jt (≤5,4jt) = 0', () => {
  assert.strictEqual(tax21.terMonthlyTax(4000000, 'A'), 0);
});

test('TER A: bruto 8jt → 1,5% = 120.000', () => {
  assert.strictEqual(tax21.terMonthlyTax(8000000, 'A'), 120000);
});

test('TER A: bruto 25jt → 10% = 2.500.000', () => {
  assert.strictEqual(tax21.terMonthlyTax(25000000, 'A'), 2500000);
});

test('TER B: bruto 8jt → 1% = 80.000 (rentang 7,3jt–9,2jt)', () => {
  // B: 7.300.000 < 8jt ≤ 9.200.000 → 1%
  assert.strictEqual(tax21.terMonthlyTax(8000000, 'B'), 80000);
});

test('TER C: bruto 8jt → 1% = 80.000', () => {
  // C: 7.800.000 < 8jt ≤ 8.850.000 → 1%
  assert.strictEqual(tax21.terMonthlyTax(8000000, 'C'), 80000);
});

test('TER A: di atas 1,4miliar → 34%', () => {
  assert.strictEqual(tax21.terMonthlyTax(1500000000, 'A'), 510000000);
});

test('kategori TER: TK/0=A; TK/1,K/0..K/2=B; K/3,C lainnya=C', () => {
  assert.strictEqual(tax21.getTerCategory('TK/0'), 'A');
  assert.strictEqual(tax21.getTerCategory('TK/1'), 'B');
  assert.strictEqual(tax21.getTerCategory('K/0'), 'B');
  assert.strictEqual(tax21.getTerCategory('TK/2'), 'B');
  assert.strictEqual(tax21.getTerCategory('K/2'), 'B');
  assert.strictEqual(tax21.getTerCategory('K/3'), 'C');
  assert.strictEqual(tax21.getTerCategory('K/I/0'), 'C');
});

// ---------------------------------------------------------------------------
// PTKP
// ---------------------------------------------------------------------------
test('PTKP: TK/0=54jt, TK/1=58,5jt, K/0=58,5jt, K/3=72jt, K/I/2=126jt', () => {
  assert.strictEqual(tax21.annualPtkpFor('TK/0'), 54000000);
  assert.strictEqual(tax21.annualPtkpFor('TK/1'), 58500000);
  assert.strictEqual(tax21.annualPtkpFor('K/0'), 58500000);
  assert.strictEqual(tax21.annualPtkpFor('K/3'), 72000000);
  assert.strictEqual(tax21.annualPtkpFor('K/I/2'), 126000000);
});

// ---------------------------------------------------------------------------
// Biaya jabatan & NPWP
// ---------------------------------------------------------------------------
test('biaya jabatan: 5% bruto, cap 500rb', () => {
  assert.strictEqual(tax21.biayaJabatan(8000000), 400000);
  assert.strictEqual(tax21.biayaJabatan(20000000), 500000); // cap
});

test('surcharge tanpa NPWP: +20%', () => {
  assert.strictEqual(tax21.npwpSurcharge(100000), 120000);
  assert.strictEqual(tax21.applyNpwpRule(100000, true), 100000);
  assert.strictEqual(tax21.applyNpwpRule(100000, false), 120000);
});

// ---------------------------------------------------------------------------
// Gross-up iteratif
// ---------------------------------------------------------------------------
test('gross-up TER konvergen: TA = PPh, dan konsisten', () => {
  // Bruto dasar 10jt (TK/0, kategori A, bruto tanpa PPh).
  const base = 10000000;
  const r = tax21.calculateMonthlyTax21({
    monthlyBrutto: base, ptkpCode: 'TK/0', hasNpwp: true, grossUp: true,
  });
  // Setelah TA ditambahkan, bruto = base + pph; PPh atas bruto tsb harus = pph.
  const check = tax21.terMonthlyTax(base + r.pph, r.category);
  assert.strictEqual(check, r.pph);
  assert.ok(r.pph > 0);
});

test('non gross-up: PPh dihitung langsung dari bruto', () => {
  const r = tax21.calculateMonthlyTax21({
    monthlyBrutto: 8000000, ptkpCode: 'TK/0', hasNpwp: true, grossUp: false,
  });
  assert.strictEqual(r.pph, 120000);
});

// ---------------------------------------------------------------------------
// Koreksi masa pajak terakhir (Desember)
// ---------------------------------------------------------------------------
test('Desember: rekap setahun — TER Jan-Nov kelebihan → koreksi negatif', () => {
  // Gaji 4jt/bulan sepanjang tahun (TK/0): TER bulanan 0, PKP tahunan 0
  // → tidak ada pajak; koreksi 0.
  const r = tax21.calculateDecemberAdjustment({
    annualBruttoBase: 48000000, annualGrossUpPph: 0, pphTerPaidJanToNov: 0,
    ptkpCode: 'TK/0', hasNpwp: true,
  });
  assert.strictEqual(r.pphDecember, 0);
});

test('Desember: koreksi menambah bila TER Jan-Nov kurang potong', () => {
  // Gaji naik di akhir tahun: Jan-Nov 8jt (TER 1,5% = 120rb/bln = 1,32jt),
  // Des 20jt. Bruto setahun = 8jt×11 + 20jt = 108jt.
  const bruttoSetahun = 108000000;
  const biayaJab = Math.min(bruttoSetahun * 0.05, 6000000); // 5,4jt
  const pkp = bruttoSetahun - biayaJab - 54000000; // 48,6jt
  const annualPph = tax21.progressiveAnnualTax(pkp); // 5% = 2.430.000
  const r = tax21.calculateDecemberAdjustment({
    annualBruttoBase: bruttoSetahun, annualGrossUpPph: 0,
    pphTerPaidJanToNov: 1320000, ptkpCode: 'TK/0', hasNpwp: true,
  });
  assert.strictEqual(r.annualPph, annualPph);
  assert.strictEqual(r.pphDecember, annualPph - 1320000);
});

// ---------------------------------------------------------------------------
// Legacy
// ---------------------------------------------------------------------------
test('legacy Gross: gaji 8jt TK/0 — PKP tahunan 86,4jt → progresif benar', () => {
  // Bruto 8jt, biaya jabatan 400rb → netto 7,6jt → setahun 91,2jt − 54jt = 37,2jt
  // → 5% = 1.860.000/setahun → /12 = 155.000
  const r = tax21.calculateLegacyMonthlyTax21({
    monthlyBrutto: 8000000, ptkpCode: 'TK/0', hasNpwp: true, method: 'Gross',
  });
  assert.strictEqual(r.pph, 155000);
});

// ---------------------------------------------------------------------------
// BPJS Kesehatan
// ---------------------------------------------------------------------------
test('BPJS Kesehatan: 4%+1% dengan cap 12jt', () => {
  const a = bpjs.kesehatan({ wage: 8000000, enabled: true });
  assert.strictEqual(a.company, 320000);
  assert.strictEqual(a.employee, 80000);

  const b = bpjs.kesehatan({ wage: 20000000, enabled: true });
  assert.strictEqual(b.cappedWage, 12000000);
  assert.strictEqual(b.company, 480000);
  assert.strictEqual(b.employee, 120000);

  const c = bpjs.kesehatan({ wage: 8000000, enabled: false });
  assert.strictEqual(c.company, 0);
  assert.strictEqual(c.employee, 0);
});

// ---------------------------------------------------------------------------
// Pembulatan & prorata
// ---------------------------------------------------------------------------
test('pembulatan ribuan turun & prorata', () => {
  assert.strictEqual(roundToThousandDown(1234), 1000);
  assert.strictEqual(roundToThousandDown(999), 0);
  assert.strictEqual(roundToThousandDown(-500), 0);
  assert.strictEqual(prorate(6000000, 10, 20).toNumber(), 3000000);
});

// ---------------------------------------------------------------------------
// Config DB-driven (perubahan regulasi tanpa edit kode)
// ---------------------------------------------------------------------------
test('config kustom: Pasal 17 flat 10% mengubah hasil', () => {
  const cfg = { pasal17Brackets: [[Number.MAX_SAFE_INTEGER, 10]] };
  assert.strictEqual(tax21.progressiveAnnualTax(100000000, cfg), 10000000);
  // tanpa config → tetap default (60jt×5% + 40jt×15% = 9jt)
  assert.strictEqual(tax21.progressiveAnnualTax(100000000), 9000000);
});

test('config kustom: ptkpAmounts exact dari DB (K/I/2 = 121,5jt, bukan 126jt)', () => {
  const cfg = { ptkpAmounts: { 'K/I/2': 121500000 } };
  assert.strictEqual(tax21.annualPtkpFor('K/I/2', cfg), 121500000);
  // fallback formula tetap ada bila kode tidak ada di config
  assert.strictEqual(tax21.annualPtkpFor('K/I/2'), 126000000);
});

test('config kustom: biaya jabatan rate 2% & cap 1jt', () => {
  const cfg = { biayaJabatan: { ratePercent: 2, maxMonthly: 1000000 } };
  assert.strictEqual(tax21.biayaJabatan(20000000, cfg), 400000); // 2% (tidak kena cap 500rb default)
  assert.strictEqual(tax21.biayaJabatan(100000000, cfg), 1000000); // cap baru
});

test('config kustom: surcharge NPWP 50%', () => {
  assert.strictEqual(tax21.npwpSurcharge(100000, { npwpSurchargePercent: 50 }), 150000);
  assert.strictEqual(tax21.npwpSurcharge(100000), 120000); // default tetap 20%
});

test('config kustom: tabel TER pengganti dipakai', () => {
  const cfg = { terTables: { A: [[10000000, 3], [1e12, 5]] } };
  assert.strictEqual(tax21.terMonthlyTax(8000000, 'A', cfg), 240000); // 3%
  assert.strictEqual(tax21.terMonthlyTax(8000000, 'A'), 120000); // default tetap 1,5%
});

test('normalizeConfig: tabel acak diurutkan defensif', () => {
  const cfg = tax21.normalizeConfig({
    pasal17Brackets: [[5000000000, 30], [60000000, 5], [Number.MAX_SAFE_INTEGER, 35]],
  });
  assert.deepStrictEqual(
    cfg.pasal17.map((b) => b[0]),
    [60000000, 5000000000, Number.MAX_SAFE_INTEGER]
  );
});

// ---------------------------------------------------------------------------
// PayrollRun — transisi status (pure)
// ---------------------------------------------------------------------------
test('run-state: alur sah DRAFT→SUBMITTED→APPROVED→LOCKED', () => {
  assert.strictEqual(runState.assertTransition('DRAFT', 'submit'), 'SUBMITTED');
  assert.strictEqual(runState.assertTransition('SUBMITTED', 'approve'), 'APPROVED');
  assert.strictEqual(runState.assertTransition('APPROVED', 'lock'), 'LOCKED');
  // SUBMITTED boleh dikembalikan ke DRAFT
  assert.strictEqual(runState.assertTransition('SUBMITTED', 'backToDraft'), 'DRAFT');
});

test('run-state: transisi liar ditolak', () => {
  assert.throws(() => runState.assertTransition('DRAFT', 'approve'));
  assert.throws(() => runState.assertTransition('DRAFT', 'lock'));
  assert.throws(() => runState.assertTransition('APPROVED', 'submit'));
  assert.throws(() => runState.assertTransition('LOCKED', 'backToDraft'));
  assert.throws(() => runState.assertTransition('LOCKED', 'submit'));
  assert.throws(() => runState.assertTransition('DRAFT', 'aksiNgawur'));
});

test('run-state: hanya DRAFT yang writable', () => {
  runState.assertRunWritable({ status: 'DRAFT' }); // tidak throw
  assert.throws(() => runState.assertRunWritable({ status: 'SUBMITTED' }));
  assert.throws(() => runState.assertRunWritable({ status: 'APPROVED' }));
  assert.throws(() => runState.assertRunWritable({ status: 'LOCKED' }));
  assert.throws(() => runState.assertRunWritable(null));
});

test('Desember dengan config DB: PTKP exact memengaruhi PKP', () => {
  const bruttoSetahun = 200000000;
  const cfg = { ptkpAmounts: { 'K/I/2': 121500000 } };
  const r = tax21.calculateDecemberAdjustment({
    annualBruttoBase: bruttoSetahun, annualGrossUpPph: 0, pphTerPaidJanToNov: 0,
    ptkpCode: 'K/I/2', hasNpwp: true, config: cfg,
  });
  // PKP = 200jt − min(10jt, 6jt) − 121,5jt = 72,5jt
  // → (60jt×5%) + (12,5jt×15%) = 3jt + 1.875.000 = 4.875.000
  assert.strictEqual(r.annualPkp, 72500000);
  assert.strictEqual(r.annualPph, 4875000);
});

// ---------------------------------------------------------------------------
// Riwayat kepegawaian — rekonstruksi efektif-tanggal (pure)
// ---------------------------------------------------------------------------
test('reconstructAt: null bila semua riwayat setelah tanggal ambang', () => {
  const rows = [
    { id: 1, effectiveDate: '2026-01-01', salaryComponents: [{ componentName: 'Basic', amount: 5000000 }] },
  ];
  assert.strictEqual(reconstructAt(rows, '2025-12-31'), null);
});

test('reconstructAt: snapshot terakhir sebelum ambang yang dipakai', () => {
  const rows = [
    { id: 1, effectiveDate: '2026-01-01', jobTitleName: 'Staff',
      salaryComponents: [{ componentName: 'Basic', amount: 5000000 }] },
    { id: 2, effectiveDate: '2026-04-01', jobTitleName: 'Supervisor',
      salaryComponents: [{ componentName: 'Basic', amount: 7000000 }, { componentName: 'Tunjangan', amount: 1000000 }] },
    { id: 3, effectiveDate: '2026-07-01', jobTitleName: 'Manager',
      salaryComponents: [{ componentName: 'Basic', amount: 10000000 }] },
  ];
  const jan = reconstructAt(rows, '2026-01-15');
  assert.strictEqual(jan.jobTitleName, 'Staff');
  assert.strictEqual(jan.totalFixedIncome, 5000000);

  const may = reconstructAt(rows, '2026-05-01'); // tepat ambang → baris Apr berlaku
  assert.strictEqual(may.jobTitleName, 'Supervisor');
  assert.strictEqual(may.totalFixedIncome, 8000000);

  const dec = reconstructAt(rows, '2026-12-31');
  assert.strictEqual(dec.jobTitleName, 'Manager');
  assert.strictEqual(dec.totalFixedIncome, 10000000);
});

test('reconstructAt: urutan aman untuk perubahan mundur & tie-break id', () => {
  const rows = [ // input TIDAK urut tanggal
    { id: 2, effectiveDate: '2026-06-01', jobTitleName: 'Baru', salaryComponents: [{ amount: 6000000 }] },
    { id: 1, effectiveDate: '2026-01-01', jobTitleName: 'Lama', salaryComponents: [{ amount: 5000000 }] },
  ];
  assert.strictEqual(reconstructAt(rows, '2026-02-01').jobTitleName, 'Lama');
  assert.strictEqual(reconstructAt(rows, '2026-08-01').jobTitleName, 'Baru');

  // Tanggal sama → id terbesar menang (perubahan terakhir).
  const tie = [
    { id: 1, effectiveDate: '2026-03-01', jobTitleName: 'A', salaryComponents: [] },
    { id: 2, effectiveDate: '2026-03-01', jobTitleName: 'B', salaryComponents: [] },
  ];
  assert.strictEqual(reconstructAt(tie, '2026-03-01').jobTitleName, 'B');
});

test('reconstructAt: salaryComponents JSON string & rusak ditangani', () => {
  const rows = [
    { id: 1, effectiveDate: '2026-01-01', salaryComponents: '[{"componentName":"Basic","amount":4000000}]' },
  ];
  assert.strictEqual(reconstructAt(rows, '2026-01-15').totalFixedIncome, 4000000);
  const broken = [{ id: 1, effectiveDate: '2026-01-01', salaryComponents: '{rusak' }];
  assert.strictEqual(reconstructAt(broken, '2026-06-01').totalFixedIncome, 0);
});

// ---------------------------------------------------------------------------
// THR — masa kerja & prorata (libs/payroll/thr.js)
// ---------------------------------------------------------------------------
const { calcServiceMonths } = require('../libs/payroll/thr');

test('THR: masa kerja 3 tahun = 36 bulan (multiplier THR tetap 1)', () => {
  assert.strictEqual(calcServiceMonths('2023-01-01', '2026-01-01', 1).effectiveMonths, 36);
});

test('THR: 3 tahun 3 bulan = 39 bulan; input Date (dari DB) didukung', () => {
  assert.strictEqual(calcServiceMonths('2023-01-01', '2026-04-01', 1).effectiveMonths, 39);
  // mysql2 mengembalikan kolom DATE sebagai Date (tengah malam lokal).
  assert.strictEqual(calcServiceMonths(new Date(2023, 0, 1), '2026-04-01', 1).effectiveMonths, 39);
});

test('THR: nearest — sisa 14 hari tidak naik, 15 hari naik', () => {
  assert.strictEqual(calcServiceMonths('2026-01-01', '2026-01-15', 1).effectiveMonths, 0);
  assert.strictEqual(calcServiceMonths('2026-01-01', '2026-01-16', 1).effectiveMonths, 1);
});

test('THR: 6 bulan penuh; 5 bln 26 hari bulat ke 6 (nearest)', () => {
  assert.strictEqual(calcServiceMonths('2026-03-01', '2026-09-01', 1).effectiveMonths, 6);
  assert.strictEqual(calcServiceMonths('2026-03-10', '2026-09-05', 1).effectiveMonths, 6);
});

test('THR: rounding down/up mengikuti konfigurasi', () => {
  assert.strictEqual(calcServiceMonths('2026-03-10', '2026-09-05', 0).effectiveMonths, 5);
  assert.strictEqual(calcServiceMonths('2026-08-10', '2026-08-25', 2).effectiveMonths, 1);
});

test('THR: THR sebelum joinDate → masa kerja 0', () => {
  assert.strictEqual(calcServiceMonths('2026-09-01', '2026-03-01', 1).effectiveMonths, 0);
});

test('THR: calculateTHR prorata & eligibility (DB nyata, idempotent via backfill)', async () => {
  const prisma = require('../libs/prisma');
  const { calculateTHR } = require('../libs/payroll/thr');
  const setup = await prisma.setupSystem.findFirst();
  const user = await prisma.users.findFirst({
    where: { status: 'Active', salaryTemplateHeaderId: { not: null } },
    select: { id: true },
  });
  assert.ok(user, 'butuh minimal 1 karyawan aktif dengan template gaji');

  // Periode THR tahun join+10 → masa kerja > 12 bln, THR = 1× basis BS.
  const year = new Date().getFullYear() + 10;
  const r = await calculateTHR({
    usersId: user.id,
    cutoffPeriod: { monthPeriod: '04', yearPeriod: String(year) },
    setup, prisma,
  });
  const bs = await prisma.usersSalary.findFirst({
    where: { usersId: user.id, componentCode: 'BS' }, select: { amount: true },
  });
  assert.strictEqual(r.eligible, true);
  assert.strictEqual(r.multiplier, 1);
  assert.strictEqual(r.amount, Number(bs.amount));

  // Periode THR tahun join → baru masuk, tidak eligible (< 1 bulan).
  const join = await prisma.users.findUnique({ where: { id: user.id }, select: { joinDate: true } });
  const r2 = await calculateTHR({
    usersId: user.id,
    cutoffPeriod: { monthPeriod: String(new Date(join.joinDate).getMonth() + 1).padStart(2, '0'), yearPeriod: String(new Date(join.joinDate).getFullYear()) },
    setup, prisma,
  });
  assert.strictEqual(r2.eligible, false);
});
