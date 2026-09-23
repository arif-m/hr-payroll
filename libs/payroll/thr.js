/**
 * thr.js — Mesin perhitungan THR (Tunjangan Hari Raya).
 *
 * Aturan dasar (Kepmenaker No. KEP.102/MEN/VI/2004 & KEP.233/2003):
 *  - Masa kerja ≥ 12 bulan : THR = 1× anggaran (basis upah).
 *  - Masa kerja 1–12 bulan : THR = (masa kerja / 12) × anggaran (prorata).
 *  - < masa kerja minimum   : tidak berhak (skip dengan alasan).
 *
 * Basis anggaran dibaca per TANGGAL dari riwayat kepegawaian efektif-tanggal
 * (libs/payroll/employment-history). Default: UPAH TERAKHIR sebelum hari raya
 * (akhir periode THR — praktik Kep-102); bisa dioverride via `asOf` (mis.
 * kebijakan anggaran per 1 Jan).
 * Karyawan tanpa riwayat di-backfill lazy oleh getSalaryAt — instalasi lama
 * tetap benar tanpa setup manual.
 *
 * Pembulatan mengikuti libs/payroll/money (round = nearest). Opsi rounding
 * hari sisa masa kerja: 0=down, 1=nearest (sisa ≥15 hari naik), 2=up.
 */
const moment = require('moment');
const { D, round } = require('./money');
const { getSalaryAt } = require('./employment-history');

/** Normalisasi input tanggal → 'YYYY-MM-DD'. Date dari mysql2 (kolom DATE)
 *  kembali sebagai tengah malam LOKAL — baca komponen lokal, bukan UTC. */
function toDateStr(d) {
  if (d instanceof Date) {
    const m = moment(d);
    return `${m.year()}-${String(m.month() + 1).padStart(2, '0')}-${String(m.date()).padStart(2, '0')}`;
  }
  return String(d);
}

/** Hitung masa kerja bulan-penuh + sisa hari antara dua tanggal (pure). */
function calcServiceMonths(joinDate, thrDate, rounding = 1) {
  const join = moment.utc(toDateStr(joinDate), 'YYYY-MM-DD', true);
  const thr = moment.utc(toDateStr(thrDate), 'YYYY-MM-DD', true);
  if (!join.isValid()) throw new Error(`joinDate tidak valid: ${joinDate}`);
  if (!thr.isValid()) throw new Error(`thrDate tidak valid: ${thrDate}`);

  // Batasi ke hari yang sama: THR sebelum join → masa kerja 0.
  if (thr.isBefore(join, 'day')) {
    return { fullMonths: 0, extraDays: 0, effectiveMonths: 0 };
  }

  const years = thr.diff(join, 'years');
  const anchor = join.clone().add(years, 'years'); // ulang tahun kerja terakhir ≤ thr
  let fullMonths = thr.diff(anchor, 'months');

  // Normalisasi kelebihan bulan (diff months bisa terlalu besar ~1 bulan).
  if (anchor.clone().add(fullMonths, 'months').isAfter(thr, 'day')) {
    fullMonths -= 1;
  }

  const lastAnchor = anchor.clone().add(fullMonths, 'months');
  let extraDays = thr.diff(lastAnchor, 'days');

  // Sisa hari ≥ panjang bulan berjaya berikutnya → sudah bulan penuh.
  const nextMonthLen = lastAnchor
    .clone().add(1, 'month').diff(lastAnchor, 'days');
  if (extraDays >= nextMonthLen) {
    fullMonths += 1;
    extraDays = 0;
  }

  // Total bulan penuh sejak join (tahun × 12 + bulan setelah ulang tahun
  // kerja terakhir) — karyawan tepat 1 tahun = 12 bulan, bukan 0.
  const totalFullMonths = years * 12 + fullMonths;

  let effectiveMonths = totalFullMonths;
  if (extraDays > 0) {
    if (rounding === 0) {
      // down: sisa hari diabaikan
    } else if (rounding === 2) {
      effectiveMonths += 1; // up
    } else {
      // nearest: sisa ≥15 hari bulat ke atas (praktik umum payroll)
      if (extraDays >= 15) effectiveMonths += 1;
    }
  }

  return { fullMonths: totalFullMonths, extraDays, effectiveMonths };
}

/**
 * Hitung THR satu karyawan untuk satu periode (pure terhadap DB lewat getSalaryAt).
 *
 * @param {Object} p
 * @param {Number} p.usersId
 * @param {Object} p.cutoffPeriod  baris cutOffPeriod (monthPeriod, yearPeriod)
 * @param {Object} [p.setup]       baris setupSystem (opsional — default dipakai bila kosong)
 * @param {Object} p.prisma        client Prisma
 * @param {String} [p.actor]       aktor untuk backfill lazy riwayat
 * @param {String|Date} [p.asOf]   override tanggal basis gaji (default: 1 Jan tahun THR)
 * @returns {Promise<Object>} { eligible, basis, serviceMonths, effectiveMonths,
 *                              multiplier, amount, reason, asOf, baseCodes }
 */
async function calculateTHR({ usersId, cutoffPeriod, setup, prisma, actor = 'system', asOf = null }) {
  const year = Number(cutoffPeriod.yearPeriod);
  const thrDateStr = `${year}-${String(cutoffPeriod.monthPeriod).padStart(2, '0')}-01`;
  const baseCodes = String((setup && setup.thrBudgetBaseCodes) || 'BS')
    .split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const eligibilityMonths = Math.max(1, Number((setup && setup.thrEligibilityMonths) || 1));
  const rounding = Number((setup && setup.thrProrateRoundDays) != null ? setup.thrProrateRoundDays : 1);

  const asOfStr = asOf
    ? toDateStr(asOf)
    : toDateStr(cutoffPeriod.endPeriod || `${year}-01-01`); // upah terakhir (Kep-102)
  const snap = await getSalaryAt(prisma, usersId, asOfStr, actor);
  if (!snap) {
    return { eligible: false, basis: 0, serviceMonths: 0, effectiveMonths: 0, multiplier: 0, amount: 0, reason: 'Riwayat gaji belum tersedia', asOf: asOfStr, baseCodes };
  }

  const service = calcServiceMonths(snap.effectiveDate, thrDateStr, rounding);
  // Masa kerja dihitung dari tanggal efektif gaji (fallback joinDate via backfill).
  const basis = (snap.salaryComponents || [])
    .filter((c) => baseCodes.includes(String(c.componentCode).toUpperCase()))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const serviceMonths = service.effectiveMonths;

  if (serviceMonths < eligibilityMonths) {
    return { eligible: false, basis, serviceMonths: service.fullMonths, effectiveMonths: serviceMonths, multiplier: 0, amount: 0, reason: `Masa kerja ${service.fullMonths} bln ${service.extraDays} hr < minimum ${eligibilityMonths} bln`, asOf: asOfStr, baseCodes };
  }

  const multiplier = serviceMonths >= 12 ? 1 : serviceMonths / 12;
  const amount = round(D(basis).times(multiplier)).toNumber();

  return {
    eligible: amount > 0,
    basis,
    serviceMonths: service.fullMonths,
    effectiveMonths: serviceMonths,
    multiplier,
    amount,
    reason: serviceMonths >= 12 ? 'Masa kerja ≥ 12 bulan (penuh)' : `Prorata ${serviceMonths}/12`,
    asOf: asOfStr,
    baseCodes,
  };
}

module.exports = { calcServiceMonths, calculateTHR };
