const { test } = require('node:test');
const assert = require('node:assert');
const { intervalsOverlap, buildOverlapMessage, TYPE_NAMES } = require('../libs/leave/overlap');

test('intervalsOverlap: beririsan, menyentuh, dan sebelahan', () => {
  // beririsan penuh
  assert.strictEqual(intervalsOverlap('2026-09-01', '2026-09-10', '2026-09-05', '2026-09-06'), true);
  // overlap parsial
  assert.strictEqual(intervalsOverlap('2026-09-01', '2026-09-05', '2026-09-05', '2026-09-10'), true);
  // menyentuh ujung (inklusif) = overlap
  assert.strictEqual(intervalsOverlap('2026-09-01', '2026-09-05', '2026-09-05', '2026-09-05'), true);
  // tepat sebelahan = TIDAK overlap (sah)
  assert.strictEqual(intervalsOverlap('2026-09-01', '2026-09-05', '2026-09-06', '2026-09-10'), false);
  assert.strictEqual(intervalsOverlap('2026-09-06', '2026-09-10', '2026-09-01', '2026-09-05'), false);
  // terpisah jauh
  assert.strictEqual(intervalsOverlap('2026-01-01', '2026-01-31', '2026-09-01', '2026-09-30'), false);
});

test('TYPE_NAMES lengkap untuk 4 jenis requestLeave', () => {
  assert.deepStrictEqual(Object.keys(TYPE_NAMES).sort(), ['1', '2', '3', '4']);
});

test('buildOverlapMessage menyebut jenis, periode, status, dan saran', () => {
  const msg = buildOverlapMessage([
    { kindLabel: 'Annual Leave', start: '2026-09-30', end: '2026-09-30', statusLabel: 'Disetujui (final)' },
    { kindLabel: 'Sick Leave', start: '2026-10-01', end: '2026-10-02', statusLabel: 'Menunggu persetujuan' },
  ]);
  assert.ok(msg.includes('beririsan'));
  assert.ok(msg.includes('Annual Leave (2026-09-30 s/d 2026-09-30, Disetujui (final))'));
  assert.ok(msg.includes('Sick Leave (2026-10-01 s/d 2026-10-02, Menunggu persetujuan)'));
  assert.ok(msg.includes('tidak tumpang tindih'));
});

test('Kontrak ekspor overlap.js', () => {
  const m = require('../libs/leave/overlap');
  for (const fn of ['intervalsOverlap', 'buildOverlapMessage', 'TYPE_NAMES', 'findOverlaps']) {
    assert.ok(m[fn] !== undefined, fn + ' harus diekspor');
  }
});
