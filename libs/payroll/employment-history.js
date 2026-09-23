/**
 * employment-history.js — riwayat gaji/jabatan efektif-tanggal.
 *
 * Setiap perubahan komponen gaji, jabatan, divisi, status kepegawaian, dan
 * PTKP direkam sebagai satu baris `employmentHistory` yang berisi SNAPSHOT
 * lengkap kondisi setelah perubahan (bukan delta saja). Rekonstruksi gaji
 * pada tanggal berapa pun = ambil snapshot baris dengan effectiveDate
 * terbesar <= tanggal; tidak perlu replay berantai.
 *
 * Fungsi pure `reconstructAt` (ambang efektif, tie-break createdAt/id)
 * dipisah agar mudah di-unit-test; fungsi DB memakainya lewat helper yang sama.
 *
 * Backfill lazy: karyawan yang belum punya riwayat (instalasi lama) dianggap
 * kondisinya berlaku sejak `joinDate` — fallback tetap benar untuk prorata THR.
 */
const moment = require('moment');

const CHANGE_TYPES = {
  INITIAL: 'INITIAL',             // backfill / kondisi awal
  CHANGE_DETAIL: 'CHANGE_DETAIL', // edit data karyawan (jabatan/divisi/status/PTKP/gaji dasar)
  ADD_COMPONENT: 'ADD_COMPONENT', // komponen gaji baru
  CHANGE_COMPONENT: 'CHANGE_COMPONENT', // ubah nominal komponen
  STATUS_CHANGE: 'STATUS_CHANGE', // promosi Probation → Permanent
};

const makeError = (message) => {
  const e = new Error(message);
  e.name = 'EmploymentHistoryError';
  return e;
};

/**
 * Bandingkan dua baris riwayat menurut (effectiveDate, createdAt, id) —
 * tie-break stabil untuk beberapa perubahan di tanggal yang sama.
 */
const byEffectiveOrder = (a, b) => {
  const d = moment(a.effectiveDate).valueOf() - moment(b.effectiveDate).valueOf();
  if (d !== 0) return d;
  const c = moment(a.createdAt || 0).valueOf() - moment(b.createdAt || 0).valueOf();
  if (c !== 0) return c;
  return (a.id || 0) - (b.id || 0);
};

/** Ambang efektif: Date | string ISO → ms epoch (tanggal murni, tanpa jam). */
const effectiveMs = (date) => {
  if (date instanceof Date) {
    // DATE column mysql2 kembali sebagai tengah malam LOKAL — ambil komponen
    // lokal (konsisten untuk zona WIB), bukan getter UTC yang menggeser balik.
    const m = moment(date);
    return Date.UTC(m.year(), m.month(), m.date());
  }
  // PARSE UTC — parsing lokal bisa menggeser 'YYYY-MM-DD' mundur sehari.
  const m = moment.utc(String(date), ['YYYY-MM-DD', moment.ISO_8601], true);
  if (!m.isValid()) throw makeError(`Tanggal tidak valid: ${date}`);
  return Date.UTC(m.year(), m.month(), m.date());
};

/**
 * (Pure) Rekonstruksi gaji/jabatan pada `date` dari daftar riwayat.
 * @param {Array}  rows  baris employmentHistory (effectiveDate, salaryComponents, ...)
 * @param {Date|string} date tanggal ambang
 * @returns {Object|null} snapshot terakhir yang berlaku, atau null bila belum ada
 */
const reconstructAt = (rows, date) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const ms = effectiveMs(date);
  const sorted = [...rows].sort(byEffectiveOrder);
  let latest = null;
  for (const row of sorted) {
    if (effectiveMs(row.effectiveDate) <= ms) latest = row;
  }
  if (!latest) return null;
  let components = [];
  if (latest.salaryComponents) {
    try {
      const parsed = typeof latest.salaryComponents === 'string'
        ? JSON.parse(latest.salaryComponents)
        : latest.salaryComponents;
      components = Array.isArray(parsed) ? parsed : [];
    } catch { components = []; }
  }
  return {
    effectiveDate: latest.effectiveDate,
    changeType: latest.changeType,
    jobTitleId: latest.jobTitleId,
    jobTitleName: latest.jobTitleName,
    divisionId: latest.divisionId,
    divisionName: latest.divisionName,
    employmentStatus: latest.employmentStatus,
    ptkpCode: latest.ptkpCode,
    salaryComponents: components,
    totalFixedIncome: components.reduce((s, c) => s + (Number(c.amount) || 0), 0),
  };
};

/**
 * Snapshot kondisi terkini satu karyawan: identitas jabatan/divisi/status/PTKP
 * + seluruh komponen gajinya (usersSalary). Dilengkapi kode PTKP via relasi.
 */
const snapshotCurrentState = async (prisma, usersId) => {
  const user = await prisma.users.findUnique({
    where: { id: Number(usersId) },
    select: {
      id: true, jobTitleId: true, divisionId: true, employmentStatus: true,
      joinDate: true,
      jobTitle: { select: { jobTitleName: true } },
      division: { select: { divisionName: true } },
      ptkp: { select: { code: true } },
      // Relasi Users→UsersSalary di schema lama bernama `user5`.
      user5: {
        select: {
          componentCode: true, componentName: true, amount: true,
          salaryComponentTypeId: true, salaryComponentCategoryName: true,
        },
        orderBy: { sequence: 'asc' },
      },
    },
  });
  if (!user) throw makeError(`Karyawan id ${usersId} tidak ditemukan`);
  return {
    jobTitleId: user.jobTitleId,
    jobTitleName: user.jobTitle?.jobTitleName || null,
    divisionId: user.divisionId,
    divisionName: user.division?.divisionName || null,
    employmentStatus: user.employmentStatus || null,
    ptkpCode: user.ptkp?.code || null,
    salaryComponents: (user.user5 || []).map((c) => ({
      componentCode: c.componentCode,
      componentName: c.componentName,
      amount: Number(c.amount) || 0,
      componentType: c.salaryComponentTypeId,
      category: c.salaryComponentCategoryName,
    })),
  };
};

/** Simpan satu baris riwayat (snapshot sudah dirangkai pemanggil). */
const recordChange = async (prisma, {
  usersId, effectiveDate, changeType, reason = null,
  jobTitleId = null, jobTitleName = null,
  divisionId = null, divisionName = null,
  employmentStatus = null, ptkpCode = null,
  salaryComponents = null, actor,
}) => {
  if (!usersId) throw makeError('usersId wajib diisi');
  if (!CHANGE_TYPES[changeType] && !Object.values(CHANGE_TYPES).includes(changeType)) {
    throw makeError(`changeType tidak dikenal: ${changeType}`);
  }
  // Parse UTC — parsing lokal menggeser 'YYYY-MM-DD' mundur sehari di zona +7.
  const date = effectiveDate instanceof Date
    ? moment.utc(effectiveDate).startOf('day').toDate()
    : moment.utc(String(effectiveDate), 'YYYY-MM-DD', true).toDate();
  if (!moment(date).isValid()) throw makeError(`effectiveDate tidak valid: ${effectiveDate}`);
  return prisma.employmentHistory.create({
    data: {
      usersId: Number(usersId),
      effectiveDate: moment.utc(date).startOf('day').toDate(),
      changeType,
      reason: reason ? String(reason).slice(0, 150) : null,
      jobTitleId, jobTitleName, divisionId, divisionName,
      employmentStatus, ptkpCode,
      salaryComponents: salaryComponents === null ? undefined : salaryComponents,
      createdBy: actor, updatedBy: actor,
    },
  });
};

/** Cek apakah karyawan sudah punya baris riwayat (untuk backfill lazy). */
const hasHistory = async (prisma, usersId) => {
  const n = await prisma.employmentHistory.count({ where: { usersId: Number(usersId) } });
  return n > 0;
};

/**
 * Backfill lazy: rekam kondisi sekarang sebagai baris INITIAL berlaku sejak
 * joinDate. Dipanggil otomatis saat getSalaryAt menemukan karyawan tanpa riwayat.
 */
const ensureHistory = async (prisma, usersId, actor = 'system') => {
  if (await hasHistory(prisma, usersId)) return null;
  const snap = await snapshotCurrentState(prisma, usersId);
  const user = await prisma.users.findUnique({
    where: { id: Number(usersId) }, select: { joinDate: true },
  });
  return recordChange(prisma, {
    usersId: Number(usersId),
    effectiveDate: user?.joinDate || new Date(),
    changeType: CHANGE_TYPES.INITIAL,
    reason: 'Backfill awal — kondisi sebelum fitur riwayat',
    ...snap,
    actor,
  });
};

/**
 * Gaji/jabatan efektif pada `date`: bila belum ada riwayat, backfill lazy
 * dulu (kondisi sekarang berlaku sejak joinDate), lalu rekonstruksi.
 */
const getSalaryAt = async (prisma, usersId, date, actor = 'system') => {
  await ensureHistory(prisma, usersId, actor);
  const rows = await prisma.employmentHistory.findMany({
    where: { usersId: Number(usersId) },
    orderBy: [{ effectiveDate: 'asc' }, { id: 'asc' }],
  });
  return reconstructAt(rows, date);
};

/**
 * Tulis riwayat INITIAL untuk SEMUA karyawan yang belum punya (sekali jalan
 * saat migrasi fitur; idempotent). Dipakai smoke test dan bisa dijalankan manual.
 */
const backfillAll = async (prisma, actor = 'system') => {
  const users = await prisma.users.findMany({
    where: { status: 'Active' },
    select: { id: true, joinDate: true },
  });
  const existing = new Set(
    (await prisma.employmentHistory.findMany({ select: { usersId: true }, distinct: ['usersId'] }))
      .map((r) => r.usersId),
  );
  let written = 0;
  for (const u of users) {
    if (existing.has(u.id)) continue;
    const snap = await snapshotCurrentState(prisma, u.id);
    await recordChange(prisma, {
      usersId: u.id,
      effectiveDate: u.joinDate,
      changeType: CHANGE_TYPES.INITIAL,
      reason: 'Backfill awal — kondisi sebelum fitur riwayat',
      ...snap,
      actor,
    });
    written += 1;
  }
  return written;
};

module.exports = {
  CHANGE_TYPES,
  reconstructAt,
  snapshotCurrentState,
  recordChange,
  ensureHistory,
  hasHistory,
  getSalaryAt,
  backfillAll,
};
