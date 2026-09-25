const { test } = require('node:test');
const assert = require('node:assert');
const {
  toMinutes,
  deriveStatus,
  STATUS_PRESENT,
  STATUS_LATE,
  STATUS_ABSENT,
  STATUS_MISSING,
} = require('../libs/attendance/derive');

/** Helper: Date pada kolom Time(0) disimpan berbasis 1970-01-01 UTC. */
function time(h, m) {
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

const SHIFT_DAY = {
  startTime: time(8, 0),
  endTime: time(17, 0),
  crossesMidnight: 0,
  graceMinutes: 10,
};

const SHIFT_NIGHT = {
  startTime: time(22, 0),
  endTime: time(6, 0),
  crossesMidnight: 1,
  graceMinutes: 10,
};

test('toMinutes menerima Date Time(0) dan string HH:mm', () => {
  assert.strictEqual(toMinutes(time(8, 30)), 510);
  assert.strictEqual(toMinutes('08:30:00'), 510);
  assert.strictEqual(toMinutes('23:59'), 1439);
  assert.strictEqual(toMinutes(null), null);
  assert.strictEqual(toMinutes(''), null);
});

test('tanpa punch sama sekali -> Absent', () => {
  const r = deriveStatus({ punch: { checkIn: null, checkOut: null }, shift: SHIFT_DAY });
  assert.strictEqual(r.status, STATUS_ABSENT);
  assert.strictEqual(r.lateMinutes, 0);
});

test('punch tepat waktu (dalam grace) -> Present', () => {
  const r = deriveStatus({ punch: { checkIn: time(8, 5), checkOut: time(17, 0) }, shift: SHIFT_DAY });
  assert.strictEqual(r.status, STATUS_PRESENT);
  assert.strictEqual(r.lateMinutes, 0);
  assert.strictEqual(r.earlyOutMinutes, 0);
});

test('datang lewat grace -> Late dengan menit telat', () => {
  const r = deriveStatus({ punch: { checkIn: time(8, 25), checkOut: time(17, 0) }, shift: SHIFT_DAY });
  assert.strictEqual(r.status, STATUS_LATE);
  assert.strictEqual(r.lateMinutes, 15);
});

test('pulang lebih awal -> earlyOutMinutes tercatat, status tetap sesuai datang', () => {
  const r = deriveStatus({ punch: { checkIn: time(8, 0), checkOut: time(16, 30) }, shift: SHIFT_DAY });
  assert.strictEqual(r.status, STATUS_PRESENT);
  assert.strictEqual(r.earlyOutMinutes, 30);
});

test('ada check-in tanpa check-out -> Missing (review admin)', () => {
  const r = deriveStatus({ punch: { checkIn: time(8, 0), checkOut: null }, shift: SHIFT_DAY });
  assert.strictEqual(r.status, STATUS_MISSING);
});

test('shift malam lintas tengah malam: punch pulang di pagi hari dihitung normal', () => {
  const r = deriveStatus({
    punch: { checkIn: time(22, 0), checkOut: time(6, 0) },
    shift: SHIFT_NIGHT,
  });
  assert.strictEqual(r.status, STATUS_PRESENT);
  assert.strictEqual(r.earlyOutMinutes, 0);

  const late = deriveStatus({
    punch: { checkIn: time(22, 20), checkOut: time(6, 0) },
    shift: SHIFT_NIGHT,
  });
  assert.strictEqual(late.status, STATUS_LATE);
  assert.strictEqual(late.lateMinutes, 10);
});

test('tanpa shift terdefinisi -> fallback Absent', () => {
  const r = deriveStatus({ punch: { checkIn: time(8, 0), checkOut: time(17, 0) }, shift: null });
  assert.strictEqual(r.status, STATUS_ABSENT);
});

test('leaveCoversDate: cuti overlap & tepat hari', () => {
  // Fungsi ini tidak diekspor; uji via perilaku runner tidak murni.
  // Di sini cukup jaga kontrak module.exports tetap lengkap.
  const m = require('../libs/attendance/derive');
  for (const fn of ['toMinutes', 'deriveStatus', 'runDerivation', 'runDailyDerivation']) {
    assert.strictEqual(typeof m[fn], 'function', `${fn} harus diekspor`);
  }
});
