const { test } = require('node:test');
const assert = require('node:assert');
const ps = require('../libs/payroll/payment-status');

const row = (status, paymentStatus) => ({ status, paymentStatus });

test('deriveRunPaymentStatus: semua OK paid = PAID', () => {
  assert.strictEqual(ps.deriveRunPaymentStatus([
    row('OK', 'PAID'), row('OK', 'PAID'),
  ]), 'PAID');
});

test('deriveRunPaymentStatus: sebagian = PARTIAL', () => {
  assert.strictEqual(ps.deriveRunPaymentStatus([
    row('OK', 'PAID'), row('OK', 'UNPAID'),
  ]), 'PARTIAL');
});

test('deriveRunPaymentStatus: belum ada = UNPAID', () => {
  assert.strictEqual(ps.deriveRunPaymentStatus([
    row('OK', 'UNPAID'), row('OK', 'UNPAID'),
  ]), 'UNPAID');
});

test('deriveRunPaymentStatus: baris FAILED diabaikan', () => {
  // Semua OK paid + FAILED unpaid → tetap PAID
  assert.strictEqual(ps.deriveRunPaymentStatus([
    row('OK', 'PAID'), row('FAILED', 'UNPAID'),
  ]), 'PAID');
  // Hanya FAILED → UNPAID
  assert.strictEqual(ps.deriveRunPaymentStatus([
    row('FAILED', 'UNPAID'),
  ]), 'UNPAID');
});

test('deriveRunPaymentStatus: daftar kosong/null = UNPAID', () => {
  assert.strictEqual(ps.deriveRunPaymentStatus([]), 'UNPAID');
  assert.strictEqual(ps.deriveRunPaymentStatus(null), 'UNPAID');
});

test('Kontrak ekspor payment-status.js', () => {
  for (const fn of ['deriveRunPaymentStatus', 'getRunnableOrThrow', 'markRunPaid', 'markEmployeesPaid',
    'deriveRowPaymentStatus', 'deriveRunPaymentStatusFromAmounts', 'sumPaymentsByUser',
    'getRemainingThp', 'addPaymentTranche', 'cancelPaymentTranche']) {
    assert.ok(ps[fn] !== undefined, fn + ' harus diekspor');
  }
  assert.deepStrictEqual(ps.RUN_STATUSES_ALLOW_PAYMENT, ['APPROVED', 'LOCKED']);
});

// ===========================================================================
// Pembayaran bertahap (tranche) — derive berbasis nominal
// ===========================================================================

const amtRow = (thp, paidTotal, status = 'OK') => ({ status, thpAmount: thp, paidTotal });

test('deriveRowPaymentStatus: UNPAID / PARTIAL / PAID + batas', () => {
  assert.strictEqual(ps.deriveRowPaymentStatus(0, 5_000_000), 'UNPAID');
  assert.strictEqual(ps.deriveRowPaymentStatus(2_000_000, 5_000_000), 'PARTIAL');
  assert.strictEqual(ps.deriveRowPaymentStatus(5_000_000, 5_000_000), 'PAID');
  // Lebih bayar (rounding) tetap PAID
  assert.strictEqual(ps.deriveRowPaymentStatus(5_000_000.005, 5_000_000), 'PAID');
  // THP nol + tanpa tranche = UNPAID (tidak boleh PAID)
  assert.strictEqual(ps.deriveRowPaymentStatus(0, 0), 'UNPAID');
});

test('deriveRunPaymentStatusFromAmounts: campuran baris tranche', () => {
  // Semua PAID → PAID
  assert.strictEqual(ps.deriveRunPaymentStatusFromAmounts([
    amtRow(5_000_000, 5_000_000), amtRow(3_000_000, 3_000_000),
  ]), 'PAID');
  // PAID + UNPAID → PARTIAL
  assert.strictEqual(ps.deriveRunPaymentStatusFromAmounts([
    amtRow(5_000_000, 5_000_000), amtRow(3_000_000, 0),
  ]), 'PARTIAL');
  // PAID + PARTIAL → PARTIAL
  assert.strictEqual(ps.deriveRunPaymentStatusFromAmounts([
    amtRow(5_000_000, 5_000_000), amtRow(3_000_000, 1_000_000),
  ]), 'PARTIAL');
  // Semua UNPAID → UNPAID
  assert.strictEqual(ps.deriveRunPaymentStatusFromAmounts([
    amtRow(5_000_000, 0), amtRow(3_000_000, 0),
  ]), 'UNPAID');
});

test('deriveRunPaymentStatusFromAmounts: baris FAILED diabaikan', () => {
  assert.strictEqual(ps.deriveRunPaymentStatusFromAmounts([
    amtRow(5_000_000, 5_000_000), amtRow(2_000_000, 0, 'FAILED'),
  ]), 'PAID');
  assert.strictEqual(ps.deriveRunPaymentStatusFromAmounts([
    amtRow(2_000_000, 0, 'FAILED'),
  ]), 'UNPAID');
});

test('deriveRunPaymentStatus: back-compat format lama & format tranche', () => {
  // Format lama ({status, paymentStatus}) tetap bekerja
  assert.strictEqual(ps.deriveRunPaymentStatus([row('OK', 'PAID'), row('OK', 'UNPAID')]), 'PARTIAL');
  // Format tranche ({thpAmount, paidTotal})
  assert.strictEqual(ps.deriveRunPaymentStatus([amtRow(5_000_000, 2_000_000)]), 'PARTIAL');
  assert.strictEqual(ps.deriveRunPaymentStatus([amtRow(5_000_000, 5_000_000)]), 'PAID');
  assert.strictEqual(ps.deriveRunPaymentStatus(null), 'UNPAID');
});

test('sumPaymentsByUser: akumulasi per karyawan', () => {
  const map = ps.sumPaymentsByUser([
    { usersId: 1, amount: '1500000' }, { usersId: 1, amount: '500000' }, { usersId: 2, amount: 2000 },
  ]);
  assert.strictEqual(map['1'], 2_000_000);
  assert.strictEqual(map['2'], 2000);
  assert.deepStrictEqual(ps.sumPaymentsByUser(null), {});
});

test('getRemainingThp: sisa dibatasi >= 0', () => {
  const detail = { thpAmount: 5_000_000, payments: [{ amount: 2_000_000 }, { amount: 500_000 }] };
  assert.strictEqual(ps.getRemainingThp(detail), 2_500_000);
  // paidTotal eksplisit menimpa
  assert.strictEqual(ps.getRemainingThp(detail, 4_000_000), 1_000_000);
  // Overpay → 0, bukan negatif
  assert.strictEqual(ps.getRemainingThp(detail, 6_000_000), 0);
});

// ===========================================================================
// parseAmount — controller (pola nominal Indonesia)
// ===========================================================================

const { parseAmount } = require('../controllers/payroll-run.controller');

test('parseAmount: pola nominal Indonesia', () => {
  assert.strictEqual(parseAmount('1500000'), 1_500_000);
  assert.strictEqual(parseAmount('1.500.000'), 1_500_000);
  assert.strictEqual(parseAmount('Rp 1.500.000'), 1_500_000);
  assert.strictEqual(parseAmount('1.500.000,50'), 1_500_000.5);
  assert.strictEqual(parseAmount('1,5'), 1.5);
  assert.strictEqual(parseAmount('1500.5'), 1500.5);
  assert.strictEqual(parseAmount('2,000'), 2000);       // koma ribuan (3 digit)
  assert.strictEqual(parseAmount('1,500,000'), 1500000); // koma ribuan berulang
  assert.strictEqual(parseAmount('  2.000.000 '), 2_000_000);
});

test('parseAmount: input tidak valid = NaN', () => {
  assert.ok(Number.isNaN(parseAmount('')));
  assert.ok(Number.isNaN(parseAmount('abc')));
  assert.ok(Number.isNaN(parseAmount(null)));
});

test('parseAmount: tanda minus diabaikan (hasil selalu >= 0)', () => {
  assert.strictEqual(parseAmount('-5'), 5);
  assert.strictEqual(parseAmount('-1.500'), 1500);
});
