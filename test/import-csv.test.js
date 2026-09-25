const { test } = require('node:test');
const assert = require('node:assert');
const {
  parseAttendanceCsv,
  detectSeparator,
  parseDateKey,
  parseTimeMinutes,
} = require('../libs/attendance/import-csv');

test('detectSeparator memilih ; bila lebih banyak dari ,', () => {
  assert.strictEqual(detectSeparator('a;b;c'), ';');
  assert.strictEqual(detectSeparator('a,b,c'), ',');
});

test('parseDateKey mendukung YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY', () => {
  assert.strictEqual(parseDateKey('2026-09-01'), '2026-09-01');
  assert.strictEqual(parseDateKey('01/09/2026'), '2026-09-01');
  assert.strictEqual(parseDateKey('01-09-2026'), '2026-09-01');
  assert.strictEqual(parseDateKey('01.09.2026'), '2026-09-01');
  assert.strictEqual(parseDateKey('13/09/2026'), '2026-09-13'); // DD > 12
  assert.strictEqual(parseDateKey('bukan-tanggal'), null);
});

test('parseTimeMinutes HH:mm dan HH:mm:ss, menolak jam gila', () => {
  assert.strictEqual(parseTimeMinutes('08:05'), 485);
  assert.strictEqual(parseTimeMinutes('08:05:30'), 485);
  assert.strictEqual(parseTimeMinutes('24:00'), null);
  assert.strictEqual(parseTimeMinutes('x'), null);
});

test('format ZKTeco titik-koma: header + pairing min/max', () => {
  const csv = [
    'No;User ID;Date;Time',
    '1;202211001;2026/09/01;08:05',
    '2;202211001;2026/09/01;12:00',   // punch bolak-balik
    '3;202211001;2026/09/01;07:55',
    '4;202211001;2026/09/01;17:02',
    '5;202211002;2026/09/01;08:00',
  ].join('\n');
  const r = parseAttendanceCsv(csv);
  assert.strictEqual(r.format, 'separated');
  assert.strictEqual(r.separator, ';');
  assert.strictEqual(r.punches.length, 5);
  // (a,b): a.202211001|2026-09-01 vs b.202211002|2026-09-01 — sort by key
  const p1 = r.paired.find((x) => x.employeeIdRaw === '202211001');
  const p2 = r.paired.find((x) => x.employeeIdRaw === '202211002');
  assert.strictEqual(p1.checkIn, '07:55'); // terpagi
  assert.strictEqual(p1.checkOut, '17:02'); // terakhir
  assert.strictEqual(p1.punchCount, 4);
  assert.strictEqual(p2.checkIn, '08:00');
  assert.strictEqual(p2.checkOut, null);   // hanya 1 punch
});

test('format koma generik dengan alias berbeda (employee/tanggal/jam)', () => {
  const csv = [
    'employee,tanggal,jam',
    '202211003,2026-09-02,08:10',
    '202211003,2026-09-02,17:00',
  ].join('\n');
  const r = parseAttendanceCsv(csv);
  assert.strictEqual(r.format, 'separated');
  assert.strictEqual(r.paired.length, 1);
  assert.strictEqual(r.paired[0].checkIn, '08:10');
  assert.strictEqual(r.paired[0].checkOut, '17:00');
});

test('kolom datetime tunggal didukung', () => {
  const csv = [
    'User ID,DateTime',
    '202211001,2026-09-03 08:00',
    '202211001,2026-09-03 17:10',
  ].join('\n');
  const r = parseAttendanceCsv(csv);
  assert.strictEqual(r.format, 'datetime');
  assert.strictEqual(r.paired[0].checkIn, '08:00');
  assert.strictEqual(r.paired[0].checkOut, '17:10');
});

test('baris rusak masuk skipped, bukan gagal total; BOM diabaikan', () => {
  const csv = '\uFEFFUser ID,Date,Time\n' +
    '202211001,2026-09-04,08:00\n' +
    ',2026-09-04,08:00\n' +              // tanpa user id
    '202211001,tanggalrusak,08:00\n' +   // tanggal rusak
    '202211001,2026-09-04,jamrusak\n' +  // jam rusak
    '202211001,2026-09-04,16:00\n';
  const r = parseAttendanceCsv(csv);
  assert.strictEqual(r.punches.length, 2);
  assert.strictEqual(r.skipped.length, 3);
  const p = r.paired[0];
  assert.strictEqual(p.checkIn, '08:00');
  assert.strictEqual(p.checkOut, '16:00');
});

test('header tak dikenali -> error jelas', () => {
  assert.throws(() => parseAttendanceCsv('Foo,Bar\n1,2\n'), /Header CSV tidak dikenali/);
});

test('file kosong -> error', () => {
  assert.throws(() => parseAttendanceCsv('User ID,Date,Time\n'), /kosong/);
});
