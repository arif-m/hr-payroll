/**
 * money.js — helper angka uang untuk mesin payroll.
 * Semua fungsi menerima Number | String | Decimal dan mengembalikan Decimal
 * (kecuali toNumber). Pembulatan standar: ROUND_HALF_UP ke 0 desimal.
 */
const Decimal = require('decimal.js');

// Konfigurasi global Decimal: 2 desimal internal, pembulatan half-up.
Decimal.set({ rounding: Decimal.ROUND_HALF_UP, precision: 30 });

const D = (value) => new Decimal(value == null || value === '' ? 0 : value);

/** Bulatkan ke rupiah penuh (half-up). */
function round(value) {
  return D(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}

/** Bulatkan ke kelipatan 1.000 ke bawah (pembulatan PPh 21 kurang bayar). Return Number. */
function roundToThousandDown(value) {
  const v = D(value);
  if (v.lte(0)) return 0;
  return v.div(1000).toDecimalPlaces(0, Decimal.ROUND_DOWN).times(1000).toNumber();
}

/** Bulatkan ke kelipatan 1.000 ke atas. Return Number. */
function roundToThousandUp(value) {
  const v = D(value);
  if (v.lte(0)) return 0;
  return v.div(1000).toDecimalPlaces(0, Decimal.ROUND_UP).times(1000).toNumber();
}

/** min(a, b) untuk Decimal. */
function minD(a, b) {
  return D(a).lte(b) ? D(a) : D(b);
}

/** max(a, b) untuk Decimal. */
function maxD(a, b) {
  return D(a).gte(b) ? D(a) : D(b);
}

/** Prorata: amount * (hariMasuk / hariKerja), dibulatkan ke rupiah. */
function prorate(amount, presentDays, workDays) {
  const wd = D(workDays);
  if (wd.lte(0)) return new Decimal(0);
  return round(D(amount).times(D(presentDays)).div(wd));
}

module.exports = { D, round, roundToThousandDown, roundToThousandUp, minD, maxD, prorate, Decimal };
