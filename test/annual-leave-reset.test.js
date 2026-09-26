const { test } = require('node:test');
const assert = require('node:assert');
const { computeResets, yearsOfService, RESET_MODES } = require('../libs/leave/annual-cycle');

const REF = new Date('2026-09-26T00:00:00Z');
const d = (s) => new Date(s);

const EMPLOYEES = [
  { id: 1, fullName: 'Baru', joinDate: d('2026-01-10'), annualLeaveBalance: 12 },   // < 1 tahun
  { id: 2, fullName: 'Tepat1Tahun', joinDate: d('2025-09-26'), annualLeaveBalance: 6 }, // tepat 1 tahun
  { id: 3, fullName: 'Senior', joinDate: d('2020-03-15'), annualLeaveBalance: 9 },  // > 1 tahun
  { id: 4, fullName: 'JoinTahunLalu', joinDate: d('2025-12-01'), annualLeaveBalance: 3 }, // tahun lalu
  { id: 5, fullName: 'SaldoNol', joinDate: d('2019-01-01'), annualLeaveBalance: 0 },// saldo 0
  { id: 6, fullName: 'TanpaJoin', joinDate: null, annualLeaveBalance: 5 },          // tanpa joinDate
];

test('RESET_MODES terdefinisi', () => {
  assert.deepStrictEqual(RESET_MODES, ['JOIN_DATE', 'CALENDAR_YEAR']);
});

test('yearsOfService floor', () => {
  assert.strictEqual(yearsOfService(d('2025-09-26'), REF), 1);
  assert.strictEqual(yearsOfService(d('2025-09-27'), REF), 0);
  assert.strictEqual(yearsOfService(d('2020-03-15'), REF), 6);
});

test('JOIN_DATE: hangus bila usia kerja >= 1 tahun penuh', () => {
  const r = computeResets(EMPLOYEES, 'JOIN_DATE', REF);
  assert.deepStrictEqual(r.resets.map((x) => x.id), [2, 3]); // Baru & JoinTahunLalu belum 1 tahun penuh
  const tepat = r.resets.find((x) => x.id === 2);
  assert.strictEqual(tepat.currentBalance, 6);
  assert.strictEqual(tepat.newBalance, 0);
  assert.strictEqual(tepat.yearsOfService, 1);
  assert.match(tepat.reason, /1 tahun/);
  assert.strictEqual(r.scanned, 6);
  assert.strictEqual(r.skipped, 4); // Baru, SaldoNol, TanpaJoin, JoinTahunLalu
});

test('CALENDAR_YEAR: hangus bila join tahun sebelum tahun referensi', () => {
  const r = computeResets(EMPLOYEES, 'CALENDAR_YEAR', REF);
  // eligible: Senior(2020), JoinTahunLalu(2025), SaldoNol(skip), Tepat1Tahun(2025)
  assert.deepStrictEqual(r.resets.map((x) => x.id), [2, 3, 4]);
  const baru = r.resets.find((x) => x.id === 4);
  assert.match(baru.reason, /Join tahun 2025/);
});

test('Semua eligible baru = saldo tetap (tidak hangus)', () => {
  const r = computeResets(EMPLOYEES.filter((e) => e.id === 1), 'JOIN_DATE', REF);
  assert.deepStrictEqual(r.resets, []);
});

test('Mode invalid -> throw (fail-closed)', () => {
  assert.throws(() => computeResets(EMPLOYEES, 'RANDOM', REF), /resetMode tidak valid/);
  assert.throws(() => computeResets(EMPLOYEES, undefined, REF), /resetMode tidak valid/);
});

test('Input tidak-normal aman (null/undefined employees)', () => {
  assert.deepStrictEqual(computeResets(null, 'JOIN_DATE', REF).resets, []);
  assert.deepStrictEqual(computeResets(undefined, 'CALENDAR_YEAR', REF).resets, []);
});

test('Kontrak: newBalance selalu 0 & data joinDate dipertahankan', () => {
  const r = computeResets(EMPLOYEES, 'JOIN_DATE', REF);
  r.resets.forEach((x) => { assert.strictEqual(x.newBalance, 0); assert.ok(x.joinDate); });
});
