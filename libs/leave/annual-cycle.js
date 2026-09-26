/**
 * annual-cycle.js — penghangusan (reset) saldo annual leave secara MANUAL & terkontrol.
 *
 * Peran masing-masing:
 *  - Accrual bulanan TETAP OTOMATIS via scheduler existing di app.js (cron tanggal 1,
 *    helper/calculate-leave.js). Modul ini TIDAK menyentuh accrual.
 *  - Penghangusan dilakukan HR lewat halaman Annual Leave Reset:
 *      1) kebijakan reset disimpan di setupAnnualLeave.resetMode
 *         (JOIN_DATE = hangus setelah 1 tahun penuh sejak join; CALENDAR_YEAR = hangus
 *         bila siklus dijalankan di tahun yang lebih baru dari tahun join),
 *      2) Preview (execute=false) menghitung tanpa mengubah data,
 *      3) Execute (execute=true) menjalankan zeroing + ledger + audit dalam SATU transaksi.
 *
 * Fail-safe: bila resetMode masih NULL, siklus menolak jalan.
 */
const moment = require('moment');
const prisma = require('../prisma');

const RESET_MODES = ['JOIN_DATE', 'CALENDAR_YEAR'];

/** Tahun kerja penuh (floor) pada refDate. */
function yearsOfService(joinDate, refDate) {
  return moment(refDate).diff(moment(joinDate), 'years', false);
}

/**
 * Murni & testable. Param:
 *  - employees: [{ id, fullName, joinDate (Date), annualLeaveBalance, annualLeave }]
 *  - mode: 'JOIN_DATE' | 'CALENDAR_YEAR'
 *  - refDate: Date
 * Return: { mode, refDate, scanned, skipped, resets: [{ id, fullName, currentBalance,
 *          newBalance: 0, yearsOfService, joinDate, reason }] }
 * Hanya karyawan ber-saldo > 0 yang eligible yang masuk daftar reset.
 */
function computeResets(employees, mode, refDate) {
  if (!RESET_MODES.includes(mode)) {
    throw new Error('resetMode tidak valid: ' + mode + ' (harus JOIN_DATE atau CALENDAR_YEAR)');
  }
  const list = Array.isArray(employees) ? employees : [];
  const ref = moment(refDate);
  const refYear = ref.year();
  const resets = [];
  let skipped = 0;

  for (const emp of list) {
    const balance = Number(emp.annualLeaveBalance || 0);
    if (!emp.joinDate || balance <= 0) { skipped++; continue; }
    const join = moment(emp.joinDate);
    const yos = yearsOfService(emp.joinDate, refDate);
    let eligible = false;
    let reason = '';
    if (mode === 'JOIN_DATE') {
      // hangus bila usia kerja >= 1 tahun penuh dihitung dari join
      eligible = ref.diff(join, 'years', true) >= 1;
      reason = 'Usia kerja ' + yos + ' tahun sejak join ' + join.format('DD-MM-YYYY');
    } else {
      // hangus bila join tahun sebelumnya (reset awal tahun kalender)
      eligible = join.year() < refYear;
      reason = 'Join tahun ' + join.year() + ' (< ' + refYear + '), reset kalender tahunan';
    }
    if (!eligible) { skipped++; continue; }
    resets.push({
      id: emp.id,
      fullName: emp.fullName,
      joinDate: emp.joinDate,
      currentBalance: balance,
      newBalance: 0,
      yearsOfService: yos,
      reason,
    });
  }
  return { mode, refDate: ref.toDate(), scanned: list.length, skipped, resets };
}

/**
 * Terapkan resets dalam transaksi (tx): zeroing saldo + catat ledger employeeAnnualLeave.
 * Ledger `day` (TinyInt) diisi 1 sebagai penanda baris siklus reset; detail di remarks.
 */
async function applyResets(tx, resets, actor) {
  const rows = Array.isArray(resets) ? resets : [];
  if (rows.length === 0) return { zeroed: 0 };
  const ids = rows.map((r) => r.id);
  const updated = await tx.users.updateMany({
    where: { id: { in: ids } },
    data: { annualLeaveBalance: 0, annualLeave: 0 },
  });
  const ref = moment();
  await tx.employeeAnnualLeave.createMany({
    data: rows.map((r) => ({
      employeeId: r.id,
      Period: ref.month() + 1,
      year: ref.year(),
      day: 1, // penanda baris reset (TinyInt); saldo hangus tercatat di remarks
      remarks: 'reset-' + (r.__mode || 'ANNUAL'),
      createdBy: actor,
      updatedBy: actor,
    })),
  });
  return { zeroed: updated.count };
}

/**
 * Jalankan siklus penghangusan.
 *  - execute=false -> preview (tanpa perubahan data).
 *  - execute=true  -> transaksi atomik: zeroing + ledger + update lastCycleRun*.
 */
async function runAnnualLeaveReset({ actor, execute }) {
  const setup = await prisma.setupAnnualLeave.findFirst();
  if (!setup) throw new Error('setupAnnualLeave belum ada');
  if (!setup.resetMode) throw new Error('Kebijakan reset belum ditetapkan (pilih JOIN_DATE atau CALENDAR_YEAR terlebih dahulu)');

  const employees = await prisma.users.findMany({
    where: { AND: [{ employmentStatus: 'Permanent' }, { status: 'Active' }] },
    select: { id: true, fullName: true, joinDate: true, annualLeaveBalance: true, annualLeave: true },
    orderBy: { id: 'asc' },
  });

  const summary = computeResets(employees, setup.resetMode, new Date());

  if (!execute) {
    return Object.assign(summary, { execute: false, lastCycleRunAt: setup.lastCycleRunAt, lastCycleRunBy: setup.lastCycleRunBy });
  }

  const tagged = summary.resets.map((r) => Object.assign({}, r, { __mode: summary.mode }));
  const result = await prisma.$transaction(async (tx) => {
    const applied = await applyResets(tx, tagged, actor);
    await tx.setupAnnualLeave.update({
      where: { id: setup.id },
      data: { lastCycleRunAt: new Date(), lastCycleRunBy: actor },
    });
    return applied;
  });

  return Object.assign(summary, {
    execute: true,
    zeroed: result.zeroed,
    lastCycleRunAt: new Date(),
    lastCycleRunBy: actor,
  });
}

module.exports = { RESET_MODES, yearsOfService, computeResets, applyResets, runAnnualLeaveReset };
