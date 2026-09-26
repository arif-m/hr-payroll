const { test } = require('node:test');
const assert = require('node:assert');
const { stagesForRoleName, kindsForStages, ROLE_STAGE_KEYWORDS, ALL_STAGES } = require('../libs/approval/stages');
const { tabsFromStages, KINDS, tabsForRole, inboxAccessForRole } = require('../libs/approval/inbox');

// ---------- stagesForRoleName (murni) ----------

test('Supervisor/SPV/Kepala/Head -> jenjang SPV', () => {
  assert.deepStrictEqual(stagesForRoleName('Supervisor'), ['SPV']);
  assert.deepStrictEqual(stagesForRoleName('supervisor'), ['SPV']);
  assert.deepStrictEqual(stagesForRoleName('SPV'), ['SPV']);
  assert.deepStrictEqual(stagesForRoleName('Kepala Divisi'), ['SPV']);
  assert.deepStrictEqual(stagesForRoleName('Department Head'), ['SPV']);
});

test('HR/HRD/Human Resource/SDM -> jenjang HR', () => {
  assert.deepStrictEqual(stagesForRoleName('HR'), ['HR']);
  assert.deepStrictEqual(stagesForRoleName('HRD'), ['HR']);
  assert.deepStrictEqual(stagesForRoleName('Human Resource'), ['HR']);
  assert.deepStrictEqual(stagesForRoleName('Human Resource Development'), ['HR']);
  assert.deepStrictEqual(stagesForRoleName('hrd'), ['HR']);
  assert.deepStrictEqual(stagesForRoleName('SDM'), ['HR']);
});

test('FA/Finance/Keuangan -> jenjang FA', () => {
  assert.deepStrictEqual(stagesForRoleName('FA'), ['FA']);
  assert.deepStrictEqual(stagesForRoleName('Finance'), ['FA']);
  assert.deepStrictEqual(stagesForRoleName('Finance Accounting'), ['FA']);
  assert.deepStrictEqual(stagesForRoleName('Keuangan'), ['FA']);
});

test('Admin/Super Admin/Administrator -> semua jenjang (override pertama)', () => {
  assert.deepStrictEqual(stagesForRoleName('Admin'), ['SPV', 'HR', 'FA']);
  assert.deepStrictEqual(stagesForRoleName('Super Admin'), ['SPV', 'HR', 'FA']);
  assert.deepStrictEqual(stagesForRoleName('Administrator'), ['SPV', 'HR', 'FA']);
  assert.deepStrictEqual(stagesForRoleName('admin'), ['SPV', 'HR', 'FA']);
});

test('Role tanpa wewenang -> kosong (fail-closed)', () => {
  assert.deepStrictEqual(stagesForRoleName('Employee'), []);
  assert.deepStrictEqual(stagesForRoleName('Manager'), []);
  assert.deepStrictEqual(stagesForRoleName(''), []);
  assert.deepStrictEqual(stagesForRoleName(null), []);
  assert.deepStrictEqual(stagesForRoleName(undefined), []);
});

test('Hasil adalah salinan baru (mutasi tidak merusak definisi)', () => {
  const a = stagesForRoleName('Admin');
  a.push('XXX');
  assert.deepStrictEqual(stagesForRoleName('Admin'), ['SPV', 'HR', 'FA']);
});

test('Urutan keyword: admin diuji lebih dulu (first-match-wins)', () => {
  assert.strictEqual(ROLE_STAGE_KEYWORDS[0].test.source.includes('admin'), true);
});

// ---------- kindsForStages (murni, fixture sintetis) ----------

const FIXTURE = [
  { key: 'a', stages: ['SPV', 'HR'] },
  { key: 'b', stages: ['FA'] },
  { key: 'c', stages: [] },
  { key: 'd' },
];

test('kindsForStages mengambil jenis yang beririsan jenjang', () => {
  assert.deepStrictEqual(kindsForStages(FIXTURE, ['SPV']), ['a']);
  assert.deepStrictEqual(kindsForStages(FIXTURE, ['HR']), ['a']);
  assert.deepStrictEqual(kindsForStages(FIXTURE, ['FA']), ['b']);
  assert.deepStrictEqual(kindsForStages(FIXTURE, ['SPV', 'HR', 'FA']), ['a', 'b']);
  assert.deepStrictEqual(kindsForStages(FIXTURE, []), []);
  // jenis tanpa properti stages tidak pernah dipilih
  assert.deepStrictEqual(kindsForStages(FIXTURE, ['SPV', 'HR', 'FA']), ['a', 'b']);
});

test('ALL_STAGES & stagesForRoleName konsisten', () => {
  assert.deepStrictEqual(ALL_STAGES, ['SPV', 'HR', 'FA']);
  for (const name of ['Admin', 'Supervisor', 'HR', 'FA']) {
    for (const s of stagesForRoleName(name)) assert.ok(ALL_STAGES.includes(s));
  }
});

// ---------- tabsFromStages terhadap KINDS asli (tanpa query DB) ----------

test('SPV -> semua 6 jenis (medreimb juga lewat supervisor)', () => {
  assert.deepStrictEqual(tabsFromStages(['SPV']), ['annual', 'sick', 'sick2', 'other', 'unpaid', 'medreimb']);
});

test('HR -> 5 jenis (medreimb keluar dari flow HR)', () => {
  assert.deepStrictEqual(tabsFromStages(['HR']), ['annual', 'sick', 'sick2', 'other', 'unpaid']);
});

test('FA -> hanya Medical Reimbursement', () => {
  assert.deepStrictEqual(tabsFromStages(['FA']), ['medreimb']);
});

test('Semua jenjang -> semua 6 jenis; kosong -> kosong', () => {
  assert.strictEqual(tabsFromStages(['SPV', 'HR', 'FA']).length, KINDS.length);
  assert.deepStrictEqual(tabsFromStages([]), []);
});

test('Kontrak flow: medreimb SPV->FA saja; POST other di /leave-management', () => {
  const { POST_TARGETS } = require('../libs/approval/inbox');
  const med = KINDS.find((k) => k.key === 'medreimb');
  assert.deepStrictEqual(med.stages, ['SPV', 'FA']);
  assert.strictEqual(POST_TARGETS.other.SPV, '/leave-management/approve-other-leave-by-supervisor');
  assert.strictEqual(POST_TARGETS.other.HR, '/leave-management/approve-other-leave-by-hr');
  assert.strictEqual(POST_TARGETS.medreimb.SPV, '/medical-reimbursement-approved-by-supervisor');
  assert.strictEqual(POST_TARGETS.medreimb.FA, '/medical-reimbursement-approved-by-fa');
});

test('Kontrak ekspor inbox.js terjaga', () => {
  const m = require('../libs/approval/inbox');
  for (const fn of ['INBOX_URI', 'KINDS', 'POST_TARGETS', 'LEGACY_MENU_URIS', 'getPendingRows', 'employeeName', 'stagesForRoleName', 'tabsFromStages', 'inboxAccessForRole', 'tabsForRole']) {
    assert.ok(m[fn] !== undefined, `${fn} harus diekspor`);
  }
  assert.strictEqual(m.INBOX_URI, '/approval-inbox');
  assert.strictEqual(typeof tabsForRole, 'function');
  assert.strictEqual(typeof inboxAccessForRole, 'function');
});
