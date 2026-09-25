const { test } = require('node:test');
const assert = require('node:assert');
const {
  DEFAULT_TIERS,
  normalizeTiers,
  pickTier,
  calculateLatePenalty,
} = require('../libs/payroll/late-penalty');

const BASE = 200000; // upah harian

test('DEFAULT_TIERS bentuk benar & tier terakhir tak terbatas', () => {
  assert.strictEqual(DEFAULT_TIERS.length, 3);
  assert.strictEqual(DEFAULT_TIERS[2].maxMinutes, null);
  const n = normalizeTiers(null);
  assert.deepStrictEqual(n, DEFAULT_TIERS);
  // JSON rusak -> fallback default
  assert.deepStrictEqual(normalizeTiers([{ nope: true }]), DEFAULT_TIERS);
  assert.deepStrictEqual(normalizeTiers('bukan-array'), DEFAULT_TIERS);
});

test('pickTier memilih tier pertama yang mencakup lateMinutes', () => {
  assert.strictEqual(pickTier(DEFAULT_TIERS, 10).type, 'NONE');
  assert.strictEqual(pickTier(DEFAULT_TIERS, 30).type, 'NONE');
  assert.strictEqual(pickTier(DEFAULT_TIERS, 31).type, 'MINUTES');
  assert.strictEqual(pickTier(DEFAULT_TIERS, 90).type, 'MINUTES');
  assert.strictEqual(pickTier(DEFAULT_TIERS, 121).type, 'HALF_DAY');
  assert.strictEqual(pickTier(DEFAULT_TIERS, 240).type, 'HALF_DAY');
});

test('telat dalam NONE -> tidak ada potongan', () => {
  const r = calculateLatePenalty({
    lateEvents: [{ lateMinutes: 15 }, { lateMinutes: 25 }],
    dailyBaseAmount: BASE,
    tiers: DEFAULT_TIERS,
  });
  assert.strictEqual(r.total, 0);
  assert.strictEqual(r.events, 2);
  assert.ok(r.perEvent.every((e) => e.amount === 0));
});

test('telat MINUTES -> potongan proporsional menit', () => {
  const r = calculateLatePenalty({
    lateEvents: [{ lateMinutes: 60 }],
    dailyBaseAmount: BASE,
    tiers: DEFAULT_TIERS,
  });
  // 200000 * 60/480 = 25000
  assert.strictEqual(r.total, 25000);
  assert.strictEqual(r.perEvent[0].type, 'MINUTES');
});

test('telat HALF_DAY -> 0.5x upah harian', () => {
  const r = calculateLatePenalty({
    lateEvents: [{ lateMinutes: 150 }],
    dailyBaseAmount: BASE,
    tiers: DEFAULT_TIERS,
  });
  assert.strictEqual(r.total, 100000);
  assert.strictEqual(r.perEvent[0].type, 'HALF_DAY');
});

test('multi-kejadian campuran dijumlahkan', () => {
  const r = calculateLatePenalty({
    lateEvents: [{ lateMinutes: 10 }, { lateMinutes: 60 }, { lateMinutes: 150 }],
    dailyBaseAmount: BASE,
    tiers: DEFAULT_TIERS,
  });
  assert.strictEqual(r.total, 0 + 25000 + 100000);
  assert.strictEqual(r.events, 3);
});

test('escalation: tiap 3 kejadian + FULL_DAY', () => {
  const r = calculateLatePenalty({
    lateEvents: [{ lateMinutes: 40 }, { lateMinutes: 45 }, { lateMinutes: 50 }, { lateMinutes: 60 }],
    dailyBaseAmount: BASE,
    tiers: DEFAULT_TIERS,
    escalation: { every: 3, type: 'FULL_DAY' },
  });
  // per event: 16666.67 + 18750 + 20833.33 + 25000 = 81250
  assert.strictEqual(r.events, 4);
  assert.strictEqual(r.escalationAmount, 200000); // 1 siklus x full day
  assert.strictEqual(r.total, 281250);
});

test('escalation tidak mencapai siklus -> 0 tambahan', () => {
  const r = calculateLatePenalty({
    lateEvents: [{ lateMinutes: 40 }, { lateMinutes: 45 }],
    dailyBaseAmount: BASE,
    tiers: DEFAULT_TIERS,
    escalation: { every: 3, type: 'FULL_DAY' },
  });
  assert.strictEqual(r.escalationAmount, 0);
});

test('basis upah 0 / negatif / tidak ada kejadian -> 0', () => {
  assert.strictEqual(calculateLatePenalty({ lateEvents: [{ lateMinutes: 60 }], dailyBaseAmount: 0 }).total, 0);
  assert.strictEqual(calculateLatePenalty({ lateEvents: [{ lateMinutes: 60 }], dailyBaseAmount: -5 }).total, 0);
  assert.strictEqual(calculateLatePenalty({ lateEvents: [], dailyBaseAmount: BASE }).total, 0);
  assert.strictEqual(calculateLatePenalty({ lateEvents: null, dailyBaseAmount: BASE }).total, 0);
});

test('workMinutesPerDay custom mempengaruhi MINUTES', () => {
  const r = calculateLatePenalty({
    lateEvents: [{ lateMinutes: 60 }],
    dailyBaseAmount: BASE,
    tiers: DEFAULT_TIERS,
    workMinutesPerDay: 600, // shift 10 jam
  });
  assert.strictEqual(r.total, 20000); // 200000*60/600
});

test('config enabled/disabled TIDAK bagian lib ini (engine yang memutuskan)', () => {
  // Dokumentasi perilaku: lib selalu hitung; engine hanya memanggil bila
  // latePenaltyEnabled=1 && BU PRESENCE. Test ini menjaga kontrak ekspor.
  const m = require('../libs/payroll/late-penalty');
  for (const fn of ['DEFAULT_TIERS', 'normalizeTiers', 'pickTier', 'calculateLatePenalty']) {
    assert.ok(m[fn] !== undefined, `${fn} harus diekspor`);
  }
});
