/**
 * period.js — helper periode & hari kerja untuk mesin payroll.
 * Mengubah logika tersebar di controller (absen/sakit/cuti + hari libur)
 * menjadi satu tempat yang bisa diuji.
 */
const moment = require('moment');

/** Rentang berpotensi tumpang tindih periode? (overlap test) */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return moment(aStart).isSameOrBefore(bEnd) && moment(bStart).isSameOrBefore(aEnd);
}

/** Potong rentang cuti agar hanya bagian dalam periode yang dihitung. */
function intersectWithPeriod(start, end, periodStart, periodEnd) {
  const s = moment.max(moment(start), moment(periodStart));
  const e = moment.min(moment(end), moment(periodEnd));
  if (s.isAfter(e)) return { start: null, end: null, days: 0 };
  return { start: s, end: e, days: 0 };
}

/**
 * Hari efektif (bukan hari libur) dalam rentang, dihitung dari daftar hari
 * libur yang diberikan pemanggil (Set berisi 'YYYY-MM-DD').
 * Logika sama dengan helper/get-total-calendar.js (5/6 hari kerja + kalender),
 * tapi dijadikan pure function — DB query dipindah ke pemanggil.
 */
function countEffectiveDays(start, end, holidaySet) {
  const holidays = holidaySet instanceof Set ? holidaySet : new Set(holidaySet || []);
  let days = 0;
  const cursor = moment(start).startOf('day');
  const last = moment(end).startOf('day');
  while (cursor.isSameOrBefore(last)) {
    if (!holidays.has(cursor.format('YYYY-MM-DD'))) days++;
    cursor.add(1, 'day');
  }
  return days;
}

/** Jumlah hari kalender inklusif. */
function inclusiveDays(start, end) {
  return moment(end).startOf('day').diff(moment(start).startOf('day'), 'days') + 1;
}

/** Bulan dalam bahasa Indonesia untuk periode (1–12). */
const MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function monthNameId(monthNumber) {
  return MONTH_ID[Number(monthNumber) - 1] || String(monthNumber);
}

module.exports = { overlaps, intersectWithPeriod, countEffectiveDays, inclusiveDays, monthNameId, MONTH_ID };
