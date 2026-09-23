/**
 * bpjs.js — Perhitungan iuran BPJS Kesehatan (pure functions).
 * Tarif berlaku: total 5% (4% perusahaan + 1% karyawan), cap upah Rp12.000.000
 * (PMK 52/PMK.05/2016 jo. regulasi cap terbaru; cap dikonfigurabel via argumen).
 */
const { D, round, minD } = require('./money');

const KESEHATAN_CAP_DEFAULT = 12000000;

/**
 * Hitung iuran BPJS Kesehatan.
 * @param {Object} p
 * @param {Number} p.wage              upah dasar iuran (gaji + tunjangan tetap)
 * @param {Boolean} p.enabled          apakah karyawan terdaftar BPJS Kesehatan
 * @param {Number} [p.capWage]         batas atas upah iuran
 * @param {Number} [p.companyRate]     % perusahaan (default 4)
 * @param {Number} [p.employeeRate]    % karyawan (default 1)
 * @returns {{ company: Number, employee: Number, cappedWage: Number, applied: Boolean }}
 */
function kesehatan(p) {
  const { wage = 0, enabled = true, capWage = KESEHATAN_CAP_DEFAULT, companyRate = 4, employeeRate = 1 } = p || {};
  if (!enabled) return { company: 0, employee: 0, cappedWage: 0, applied: false };

  const cappedWage = minD(D(wage), capWage);
  return {
    company: round(cappedWage.times(companyRate).div(100)).toNumber(),
    employee: round(cappedWage.times(employeeRate).div(100)).toNumber(),
    cappedWage: cappedWage.toNumber(),
    applied: true,
  };
}

module.exports = { kesehatan, KESEHATAN_CAP_DEFAULT };
