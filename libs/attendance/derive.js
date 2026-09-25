const prisma = require('../prisma');
const moment = require('moment');

/**
 * Derivasi status kehadiran untuk business unit mode PRESENCE (pabrik).
 *
 * Prinsip:
 * - Hanya menyentuh karyawan di BU ber-mode 'PRESENCE'.
 * - Tidak pernah menimpa baris manual tanpa punch (input admin/izin/cuti).
 * - Baris dengan punch (checkIn/checkOut) boleh di-stamp ulang statusnya,
 *   karena itu data punch, bukan keputusan manual.
 * - Hari libur kalender & cuti approved di-skip (bukan absent).
 * - Periode cut-off yang sudah attendanceClosed tidak ditulis lagi.
 */

const STATUS_PRESENT = 'P';
const STATUS_LATE = 'L';
const STATUS_ABSENT = 'A';
const STATUS_MISSING = 'M'; // ada check-in tanpa check-out -> butuh review admin

// ---------------------------------------------------------------------------
// Helpers murni (mudah dites)
// ---------------------------------------------------------------------------

/** Normalisasi time ke menit-since-midnight. Menerima Date (base 1970 UTC)
 *  dari kolom @db.Time atau string 'HH:mm[:ss]'. */
function toMinutes(t) {
  if (t === null || t === undefined || t === '') return null;
  if (t instanceof Date) return t.getUTCHours() * 60 + t.getUTCMinutes();
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Murni: hitung status satu hari kerja dari punch + shift + konteks.
 *
 * @param {object} p
 * @param {{checkIn: any, checkOut: any}} p.punch   punch hari itu (boleh null)
 * @param {{startTime: any, endTime: any, crossesMidnight: bool, graceMinutes: number}} p.shift
 * @returns {{status: string, lateMinutes: number, earlyOutMinutes: number}}
 */
function deriveStatus({ punch, shift }) {
  const empty = { status: STATUS_ABSENT, lateMinutes: 0, earlyOutMinutes: 0 };
  if (!shift) return empty;

  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const crosses = Boolean(shift.crossesMidnight);
  if (start === null || end === null) return empty;
  const grace = Number(shift.graceMinutes) || 0;

  const inMin = toMinutes(punch && punch.checkIn);
  const outMin = toMinutes(punch && punch.checkOut);

  // Tidak absen masuk sama sekali -> Absent
  if (inMin === null && outMin === null) return empty;

  // Shift lintas tengah malam: jam pulang yang lebih kecil dari jam masuk
  // berarti sudah melewati 00:00.
  let endEff = end + (crosses ? 1440 : 0);
  let outEff = outMin === null ? null : outMin + (crosses && outMin < start ? 1440 : 0);

  const lateMinutes = Math.max(0, inMin - (start + grace));

  // Ada check-in tapi tidak ada check-out -> butuh review admin.
  if (outEff === null) {
    return { status: STATUS_MISSING, lateMinutes, earlyOutMinutes: 0 };
  }

  const earlyOutMinutes = Math.max(0, endEff - outEff);
  const status = lateMinutes > 0 ? STATUS_LATE : STATUS_PRESENT;
  return { status, lateMinutes, earlyOutMinutes };
}

/** YYYY-MM-DD lokal-UTC agar konsisten dengan kolom @db.Date. */
function dateKey(d) {
  return moment.utc(d).format('YYYY-MM-DD');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/** Resolusi shift untuk satu karyawan pada tanggal D.
 *  Prioritas: penugasan efektif terbaru <= D, lalu defaultShift BU. */
async function resolveShiftForDate(employee, workDate) {
  const key = moment.utc(workDate).format('YYYY-MM-DD');
  const assignments = (employee.employeeShifts || [])
    .filter((a) => moment.utc(a.effectiveFrom).format('YYYY-MM-DD') <= key)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
  if (assignments.length > 0) return assignments[0].shift;
  return employee.businessUnit && employee.businessUnit.defaultShift
    ? employee.businessUnit.defaultShift
    : null;
}

/** Cuti approved yang menjangkau tanggal D (semua jenis cuti = excused). */
function leaveCoversDate(leaves, workDate) {
  const key = moment.utc(workDate).format('YYYY-MM-DD');
  return (leaves || []).some((lv) => {
    const s = moment.utc(lv.startDuration).format('YYYY-MM-DD');
    const e = moment.utc(lv.endDuration).format('YYYY-MM-DD');
    return s <= key && key <= e;
  });
}

/**
 * Jalankan derivasi untuk rentang tanggal.
 * @returns {Promise<{created:number, updated:number, skippedManual:number,
 *          skippedClosed:number, skippedLeave:number, warnings:string[]}>}
 */
async function runDerivation({ startDate, endDate, actor }) {
  const warnings = [];
  const start = moment.utc(startDate).startOf('day');
  const end = moment.utc(endDate).startOf('day');
  if (end.isBefore(start)) {
    throw new Error('endDate harus >= startDate');
  }

  // 1. Karyawan aktif di BU mode PRESENCE
  const employees = await prisma.users.findMany({
    where: { status: 'Active', businessUnit: { attendanceMode: 'PRESENCE' } },
    include: {
      businessUnit: { include: { defaultShift: true } },
      division: { select: { id: true, divisionName: true } },
      jobTitle: { select: { id: true, jobTitleName: true } },
      employeeShifts: { include: { shift: true }, orderBy: { effectiveFrom: 'asc' } },
    },
  });

  // 2. Hari libur kalender (is_workdays 0)
  const holidays = await prisma.setupCalendar.findMany({
    where: { is_workdays: 0, eventDate: { gte: start.toDate(), lte: end.toDate() } },
    select: { eventDate: true },
  });
  const holidayKeys = new Set(holidays.map((h) => dateKey(h.eventDate)));

  // 3. Cuti approved yang overlap rentang
  const leaves = await prisma.requestLeave.findMany({
    where: {
      isApproved: 1,
      employeeId: { in: employees.map((e) => e.id) },
      OR: [
        { startDuration: { lte: end.toDate(), gte: start.toDate() } },
        { endDuration: { lte: end.toDate(), gte: start.toDate() } },
      ],
    },
    select: { employeeId: true, startDuration: true, endDuration: true },
  });
  const leavesByEmployee = {};
  for (const lv of leaves) {
    (leavesByEmployee[lv.employeeId] = leavesByEmployee[lv.employeeId] || []).push(lv);
  }

  // 4. Baris kehadiran existing di rentang
  const existingRows = await prisma.timeAttendance.findMany({
    where: {
      workDate: { gte: start.toDate(), lte: end.toDate() },
      employeeId: { in: employees.map((e) => e.id) },
    },
  });
  const rowsByKey = {};
  for (const r of existingRows) {
    rowsByKey[`${r.employeeId}|${dateKey(r.workDate)}`] = r;
  }

  // 5. Guard periode: attendanceClosed per tanggal (berdasarkan cut-off yang
  //    mencakup tanggal tersebut).
  const periods = await prisma.cutOffPeriod.findMany();
  function isClosedForDate(d) {
    const key = dateKey(d);
    return periods.some(
      (p) =>
        p.attendanceClosed === 1 &&
        dateKey(p.startPeriod) <= key &&
        key <= dateKey(p.endPeriod)
    );
  }

  const byUser = actor || 'SYSTEM-DERIVE';
  const stats = {
    created: 0,
    updated: 0,
    skippedManual: 0,
    skippedClosed: 0,
    skippedLeave: 0,
    warnings,
  };
  const toCreate = [];

  for (let d = start.clone(); !d.isAfter(end); d.add(1, 'day')) {
    const key = dateKey(d);
    const workDate = d.toDate();
    if (holidayKeys.has(key)) continue;
    const closed = isClosedForDate(workDate);

    for (const emp of employees) {
      if (leaveCoversDate(leavesByEmployee[emp.id], workDate)) {
        stats.skippedLeave += 1;
        continue;
      }
      const existing = rowsByKey[`${emp.id}|${key}`];
      const hasPunch = Boolean(existing && (existing.checkIn || existing.checkOut));
      const isDerivedRow = Boolean(existing && existing.isDerived === 1);

      // Baris manual tanpa punch: jangan pernah ditimpa.
      if (existing && !hasPunch && !isDerivedRow) {
        stats.skippedManual += 1;
        continue;
      }
      if (closed) {
        // Punch boleh tetap distamp jika periode closed? Tidak — hormati lock.
        if (!existing || !hasPunch) stats.skippedClosed += 1;
        continue;
      }

      const shift = await resolveShiftForDate(emp, workDate);
      if (!shift) {
        warnings.push(`${emp.fullName} (${key}): tidak ada shift & BU default`);
        continue;
      }

      const derived = deriveStatus({
        punch: existing ? { checkIn: existing.checkIn, checkOut: existing.checkOut } : null,
        shift,
      });

      if (existing) {
        await prisma.timeAttendance.update({
          where: { id: existing.id },
          data: {
            status: derived.status,
            lateMinutes: derived.lateMinutes,
            earlyOutMinutes: derived.earlyOutMinutes,
            shiftId: shift.id,
            updatedBy: byUser,
          },
        });
        stats.updated += 1;
      } else {
        toCreate.push({
          createdBy: byUser,
          updatedBy: byUser,
          status: derived.status,
          employeeId: emp.id,
          fullName: emp.fullName,
          businessUnitId: emp.businessUnitId,
          businessUnitName: emp.businessUnit ? emp.businessUnit.businessUnitName : null,
          divisionId: emp.divisionId,
          divisionName: emp.division ? emp.division.divisionName : null,
          jobTitleId: emp.jobTitleId,
          jobTitleName: emp.jobTitle ? emp.jobTitle.jobTitleName : null,
          workDate,
          reason: null,
          lateMinutes: derived.lateMinutes,
          earlyOutMinutes: derived.earlyOutMinutes,
          shiftId: shift.id,
          isDerived: 1,
        });
        stats.created += 1;
      }
    }
  }

  if (toCreate.length > 0) {
    await prisma.timeAttendance.createMany({ data: toCreate, skipDuplicates: true });
  }
  return stats;
}

/** Untuk cron harian: derivasi tanggal kemarin. */
async function runDailyDerivation() {
  const yesterday = moment.utc().subtract(1, 'day').format('YYYY-MM-DD');
  const stats = await runDerivation({ startDate: yesterday, endDate: yesterday });
  console.log('[attendance-derive]', yesterday, JSON.stringify(stats));
  return stats;
}

module.exports = {
  toMinutes,
  deriveStatus,
  runDerivation,
  runDailyDerivation,
  STATUS_PRESENT,
  STATUS_LATE,
  STATUS_ABSENT,
  STATUS_MISSING,
};
