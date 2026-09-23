/**
 * Unit test export SPT Masa A1/A2 — pure function (tanpa DB).
 * Jalankan: node --test test/spt-masa.test.js
 */
const test = require('node:test');
const assert = require('node:assert');

const { buildSptRows, normalizeNpwp, ptkpCodeToNumber } = require('../libs/payroll/spt-masa');

test('normalizeNpwp membuang semua non-digit', () => {
  assert.strictEqual(normalizeNpwp('01.234.567-8.901-000'), '012345678901000');
  assert.strictEqual(normalizeNpwp(' 12.345.678.9-012.345 '), '123456789012345');
  assert.strictEqual(normalizeNpwp(null), '');
  assert.strictEqual(normalizeNpwp(''), '');
  assert.strictEqual(normalizeNpwp('abc'), '');
});

test('ptkpCodeToNumber memetakan kode PTKP ke angka e-SPT 0–11', () => {
  assert.strictEqual(ptkpCodeToNumber('TK/0'), 0);
  assert.strictEqual(ptkpCodeToNumber('TK/3'), 3);
  assert.strictEqual(ptkpCodeToNumber('K/0'), 4);
  assert.strictEqual(ptkpCodeToNumber('K/2'), 6);
  assert.strictEqual(ptkpCodeToNumber('K/I/0'), 8);
  assert.strictEqual(ptkpCodeToNumber('K/I/3'), 11);
  assert.strictEqual(ptkpCodeToNumber(null), 0); // fallback TK/0
  assert.strictEqual(ptkpCodeToNumber('xxx'), 0);
});

function payslip(overrides = {}) {
  return {
    fullName: 'Budi Santoso',
    npwp: '01.234.567-8.901-000',
    ptkp: 'TK/0',
    monthPeriod: '01',
    yearPeriod: '2026',
    payslip_details: [
      { code: 'BS', name: 'Basic Salary', category: 'Earnings', isTaxBase: 1, amount: 10000000 },
      { code: 'OC', name: 'Overtime', category: 'Earnings', isTaxBase: 1, amount: 500000 },
      { code: 'BKS', name: 'BPJS Kes. Perusahaan', category: 'Earnings', isTaxBase: 0, amount: 850000 },
      { code: 'TA', name: 'Tax Allowance', category: 'Earnings', isTaxBase: 1, amount: 300000 },
      { code: 'TD', name: 'PPH 21', category: 'Deductions', isTaxBase: 1, amount: 45000 },
      { code: 'BKE', name: 'BPJS Kes. Karyawan', category: 'Deductions', isTaxBase: 1, amount: 150000 },
    ],
    ...overrides,
  };
}

test('buildSptRows A1: bruto = Σ Earnings isTaxBase=1; PPh21 = Σ kode TD', () => {
  const r = buildSptRows([payslip()], 'A1');
  assert.strictEqual(r.count, 1);
  assert.strictEqual(r.totalBruto, 10800000); // BS+OC+TA (BKS isTaxBase=0 tidak masuk)
  assert.strictEqual(r.totalPph, 45000);
  const lines = r.csv.trim().split('\r\n');
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0], 'Masa Pajak,Tahun Pajak,NPWP,Nama Pegawai,Kode PTKP,Jumlah Bruto (Rp),Jumlah PPh21 (Rp)');
  assert.ok(lines[1].startsWith('1,2026,012345678901000,Budi Santoso,0,10800000.00,45000.00'));
  assert.strictEqual(r.warnings.length, 0);
});

test('buildSptRows A2: tanpa kolom Kode PTKP', () => {
  const r = buildSptRows([payslip()], 'a2'); // lowercase ok
  assert.strictEqual(r.csv.split('\r\n')[0], 'Masa Pajak,Tahun Pajak,NPWP,Nama,Jumlah Bruto (Rp),Jumlah PPh21 (Rp)');
  assert.ok(r.csv.includes('Budi Santoso,10800000.00,45000.00'));
  assert.ok(!r.csv.includes('Kode PTKP'));
});

test('buildSptRows: PPh21 Desember negatif (koreksi lebih potong) tetap ditulis apa adanya', () => {
  const r = buildSptRows([payslip({ monthPeriod: '12', payslip_details: [
    { code: 'BS', category: 'Earnings', isTaxBase: 1, amount: 10000000 },
    { code: 'TD', category: 'Deductions', isTaxBase: 1, amount: -25000 },
  ] })], 'A1');
  assert.strictEqual(r.totalPph, -25000);
  assert.ok(r.csv.includes(',-25000.00'));
});

test('buildSptRows: beberapa payslip, total terakumulasi, urutan dipertahankan', () => {
  const r = buildSptRows([
    payslip({ fullName: 'Andi' }),
    payslip({ fullName: 'Citra', npwp: '' }),
  ], 'A1');
  assert.strictEqual(r.count, 2);
  assert.strictEqual(r.totalBruto, 21600000);
  assert.strictEqual(r.totalPph, 90000);
  assert.deepStrictEqual(r.warnings, ['Citra (NPWP kosong)']);
});

test('buildSptRows: field berisi koma di-quote sesuai aturan CSV', () => {
  const r = buildSptRows([payslip({ fullName: 'Siti, S.Pd' })], 'A1');
  assert.ok(r.csv.includes('"Siti, S.Pd"'));
});

test('buildSptRows: form tidak dikenal tetap diproses sebagai A1 (validasi di buildSptMasa)', () => {
  const r = buildSptRows([payslip()], 'ZZ');
  assert.strictEqual(r.csv.split('\r\n')[0], 'Masa Pajak,Tahun Pajak,NPWP,Nama Pegawai,Kode PTKP,Jumlah Bruto (Rp),Jumlah PPh21 (Rp)');
});
