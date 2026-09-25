/**
 * late-penalty.js — Sanksi keterlambatan untuk Business Unit mode PRESENCE
 * (pabrik). Fase 2 integrasi payroll.
 *
 * Prinsip:
 * - Hanya kejadian TELAT (baris TimeAttendance status 'L' dengan lateMinutes)
 *   yang dikenai sanksi. ABSENT tidak di-sanksi di sini — absent sudah
 *   menurunkan prorating komponen Variable (anti double-penalty).
 * - Baris 'M' (missing check-out) juga tidak dikenai sanksi sebelum
 *   direview admin.
 * - Pure function tanpa DB agar mudah dites; engine yang mengambil data.
 */

/** Tingkatan default (dipakai bila setupSystem.latePenaltyTiers null).
 *  maxMinutes null = tak terbatas (tier terakhir). */
const DEFAULT_TIERS = [
  { maxMinutes: 30, type: 'NONE' },      // dalam 30 menit: toleransi (tidak dipotong)
  { maxMinutes: 120, type: 'MINUTES' },  // 31–120 menit: potongan proporsional menit
  { maxMinutes: null, type: 'HALF_DAY' } // >120 menit: setengah hari upah
];

/** FRACTION: berapa fraksi upah harian per tipe tier. */
const FRACTIONS = {
  NONE: 0,
  MINUTES: null, // dihitung proporsional: lateMinutes / (menit kerja efektif)
  HALF_DAY: 0.5,
  FULL_DAY: 1,
};

/** Normalisasi tier dari JSON DB (aman terhadap bentuk tidak lengkap). */
function normalizeTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) return DEFAULT_TIERS;
  const cleaned = tiers
    .filter((t) => t && typeof t === 'object' && FRACTIONS[t.type] !== undefined)
    .map((t) => ({ maxMinutes: t.maxMinutes === undefined ? null : (t.maxMinutes === null ? null : Number(t.maxMinutes)), type: t.type }));
  return cleaned.length > 0 ? cleaned : DEFAULT_TIERS;
}

/** Pilih tier untuk satu kejadian telat: tier pertama dengan
 *  maxMinutes >= lateMinutes, atau maxMinutes null. */
function pickTier(tiers, lateMinutes) {
  for (const t of tiers) {
    if (t.maxMinutes === null || lateMinutes <= t.maxMinutes) return t;
  }
  return null; // konfigurasi tidak menutup kasus ini (seharusnya tier terakhir null)
}

/** Menit kerja efektif per hari untuk prorata MINUTES — dihitung dari
 *  shift bila tersedia, fallback 8 jam. */
function effectiveWorkMinutes(shift) {
  if (shift && shift.startTime && shift.endTime) {
    const toMin = (t) => {
      if (t instanceof Date) return t.getUTCHours() * 60 + t.getUTCMinutes();
      const m = String(t).trim().match(/^(\d{1,2}):(\d{2})/);
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const s = toMin(shift.startTime);
    let e = toMin(shift.endTime);
    if (s !== null && e !== null) {
      if (shift.crossesMidnight && e < s) e += 1440;
      const len = e - s - (Number(shift.graceMinutes) || 0);
      if (len > 0) return len;
    }
  }
  return 480; // fallback 8 jam
}

/**
 * Hitung total potongan telat untuk satu karyawan dalam satu periode.
 *
 * @param {object} p
 * @param {Array<{lateMinutes:number}>} p.lateEvents  kejadian telat periode ini
 * @param {number} p.dailyBaseAmount  upah harian (basis sanksi)
 * @param {Array<{maxMinutes:number|null,type:string}>|null} p.tiers
 * @param {{every:number,type:'HALF_DAY'|'FULL_DAY'}|null} p.escalation
 * @param {number} [p.workMinutesPerDay]  untuk tipe MINUTES (default 480)
 * @returns {{total: number, perEvent: Array<{lateMinutes:number,type:string,amount:number}>,
 *           escalationAmount: number, events: number}}
 */
function calculateLatePenalty({ lateEvents, dailyBaseAmount, tiers, escalation, workMinutesPerDay }) {
  const empty = { total: 0, perEvent: [], escalationAmount: 0, events: 0 };
  const events = Array.isArray(lateEvents) ? lateEvents.filter((e) => e && Number(e.lateMinutes) > 0) : [];
  if (events.length === 0) return empty;
  const base = Number(dailyBaseAmount);
  if (!isFinite(base) || base <= 0) return empty;

  const effTiers = normalizeTiers(tiers);
  const minPerDay = Number(workMinutesPerDay) > 0 ? Number(workMinutesPerDay) : 480;

  const perEvent = [];
  let sum = 0;
  for (const ev of events) {
    const lateMinutes = Math.max(0, Math.round(Number(ev.lateMinutes)));
    const tier = pickTier(effTiers, lateMinutes);
    if (!tier) continue;
    let amount = 0;
    if (tier.type === 'MINUTES') {
      amount = round2(base * (lateMinutes / minPerDay));
    } else {
      amount = round2(base * FRACTIONS[tier.type]);
    }
    perEvent.push({ lateMinutes, type: tier.type, amount });
    sum += amount;
  }

  // Escalation kumulatif: tiap N kejadian telat tambah potongan flat.
  let escalationAmount = 0;
  const esc = escalation && Number(escalation.every) > 0 && FRACTIONS[escalation.type] !== undefined && FRACTIONS[escalation.type] !== null
    ? escalation
    : null;
  if (esc) {
    const cycles = Math.floor(events.length / Number(esc.every));
    escalationAmount = round2(base * FRACTIONS[esc.type] * cycles);
  }

  return { total: round2(sum + escalationAmount), perEvent, escalationAmount, events: events.length };
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

module.exports = {
  DEFAULT_TIERS,
  FRACTIONS,
  normalizeTiers,
  pickTier,
  calculateLatePenalty,
};
