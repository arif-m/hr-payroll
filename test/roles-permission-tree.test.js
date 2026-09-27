const { test } = require('node:test');
const assert = require('node:assert');
const tree = require('../public/js/roles-permission-tree');

// Struktur uji: 1 -> 11 -> 111 (3 level), 1 -> 12, 2 flat, 3 -> 31
const ROWS = [
  { id: 1, parentId: 0 },
  { id: 11, parentId: 1 },
  { id: 111, parentId: 11 },
  { id: 12, parentId: 1 },
  { id: 2, parentId: 0 },
  { id: 3, parentId: 0 },
  { id: 31, parentId: 3 },
];

function mkState() {
  const s = {};
  ROWS.forEach(r => { s[r.id] = { read: 0, create: 0, update: 0, delete: 0, inactive: 0 }; });
  return s;
}

test('collectDescendants: anak, cucu, dan count', () => {
  assert.deepStrictEqual(tree.collectDescendants(ROWS, 1).sort(function (a, b) { return a - b; }), [11, 12, 111]);
  assert.deepStrictEqual(tree.collectDescendants(ROWS, 11), [111]);
  assert.deepStrictEqual(tree.collectDescendants(ROWS, 2), []);
  assert.strictEqual(tree.countDescendants(ROWS, 1), 3);
  assert.strictEqual(tree.countDescendants(ROWS, 2), 0);
});

test('computeDepth: level 0/1/2', () => {
  const d = tree.computeDepth(ROWS);
  assert.strictEqual(d[1], 0);
  assert.strictEqual(d[11], 1);
  assert.strictEqual(d[111], 2);
  assert.strictEqual(d[2], 0);
});

test('cascade: centang Read parent 1 -> semua keturunan Read ON', () => {
  const next = tree.applyCascade(ROWS, mkState(), [{ id: 1, right: 'read', on: true }]);
  assert.strictEqual(next[1].read, 1);
  assert.strictEqual(next[11].read, 1);
  assert.strictEqual(next[111].read, 1);
  assert.strictEqual(next[12].read, 1);
  // hak lain tidak ikut
  assert.strictEqual(next[11].create, 0);
  // modul lain tidak terpengaruh
  assert.strictEqual(next[2].read, 0);
  assert.strictEqual(next[31].read, 0);
});

test('cascade: centang Create di cucu 111 -> parent & kakek Read ON', () => {
  const next = tree.applyCascade(ROWS, mkState(), [{ id: 111, right: 'create', on: true }]);
  assert.strictEqual(next[111].create, 1);
  assert.strictEqual(next[11].read, 1);
  assert.strictEqual(next[1].read, 1);
  // create parent tidak ikut nyala
  assert.strictEqual(next[1].create, 0);
  assert.strictEqual(next[11].create, 0);
});

test('cascade: uncheck Read parent -> semua keturunan kosong total', () => {
  let st = tree.applyCascade(ROWS, mkState(), [
    { id: 1, right: 'read', on: true },
    { id: 11, right: 'update', on: true },
    { id: 111, right: 'delete', on: true },
  ]);
  st = tree.applyCascade(ROWS, st, [{ id: 1, right: 'read', on: false }]);
  assert.strictEqual(st[1].read, 0);
  for (const id of [11, 111, 12]) {
    for (const r of ['read', 'create', 'update', 'delete', 'inactive']) {
      assert.strictEqual(st[id][r], 0, `${id}.${r} harus 0`);
    }
  }
  // modul lain tetap aman
  assert.strictEqual(st[2].read, 0);
});

test('cascade: uncheck Create parent TIDAK mematikan anak (hanya Read yang mengikat)', () => {
  let st = tree.applyCascade(ROWS, mkState(), [
    { id: 1, right: 'read', on: true },
    { id: 11, right: 'create', on: true },
  ]);
  st = tree.applyCascade(ROWS, st, [{ id: 1, right: 'create', on: false }]);
  assert.strictEqual(st[11].create, 1);
  assert.strictEqual(st[11].read, 1);
});

test('cascade: uncheck Read anak tidak menghapus saudara', () => {
  let st = tree.applyCascade(ROWS, mkState(), [
    { id: 1, right: 'read', on: true },
    { id: 11, right: 'read', on: true },
    { id: 12, right: 'read', on: true },
  ]);
  st = tree.applyCascade(ROWS, st, [{ id: 11, right: 'read', on: false }]);
  assert.strictEqual(st[11].read, 0);
  assert.strictEqual(st[12].read, 1);
  assert.strictEqual(st[111].read, 0);
  assert.strictEqual(st[1].read, 1);
});

test('childIds: anak langsung saja', () => {
  assert.deepStrictEqual(tree.childIds(ROWS, 1).sort((a, b) => a - b), [11, 12]);
  assert.deepStrictEqual(tree.childIds(ROWS, 11), [111]);
  assert.deepStrictEqual(tree.childIds(ROWS, 2), []);
});

test('descendantsWithAnyRight: hanya keturunan berhak', () => {
  const st = mkState();
  assert.deepStrictEqual(tree.descendantsWithAnyRight(ROWS, st, 1), []);
  st[12].read = 1; st[111].create = 1;
  assert.deepStrictEqual(tree.descendantsWithAnyRight(ROWS, st, 1).sort((a, b) => a - b), [12, 111]);
  assert.deepStrictEqual(tree.descendantsWithAnyRight(ROWS, st, 2), []);
});

test('toDepthFirstRows: interleave asli payroll jadi kontigu per parent', () => {
  // Replika urutan DB by sequence (id | parentId):
  // 22(0) 72(22) 23(72) 73(22) 46(75!) 74(22) 75(22) 35(73) 62(73) 26(75) 47(74) 28(75)
  const rows = [
    { id: 22, parentId: 0 },
    { id: 72, parentId: 22 },
    { id: 23, parentId: 72 },
    { id: 73, parentId: 22 },
    { id: 46, parentId: 75 },
    { id: 74, parentId: 22 },
    { id: 75, parentId: 22 },
    { id: 35, parentId: 73 },
    { id: 62, parentId: 73 },
    { id: 26, parentId: 75 },
    { id: 47, parentId: 74 },
    { id: 28, parentId: 75 },
  ];
  const out = tree.toDepthFirstRows(rows);
  // jumlah baris tetap sama
  assert.strictEqual(out.length, rows.length);
  const ids = out.map(r => r.id);
  // DFS: 22 -> 72 -> 23 -> 73 -> 35 -> 62 -> 74 -> 47 -> 75 -> 46 -> 26 -> 28
  assert.deepStrictEqual(ids, [22, 72, 23, 73, 35, 62, 74, 47, 75, 46, 26, 28]);
  // depth: 22=0; 72,73,74,75=1; anak-anaknya=2 (termasuk 46 yang datang duluan di DB)
  const d = tree.computeDepth(out);
  assert.strictEqual(d[22], 0);
  for (const id of [72, 73, 74, 75]) assert.strictEqual(d[id], 1, 'depth 1 untuk ' + id);
  for (const id of [23, 35, 62, 46, 26, 47, 28]) assert.strictEqual(d[id], 2, 'depth 2 untuk ' + id);
  // jumlah keturunan parent di urutan DFS
  const c = {};
  out.forEach(r => { c[r.id] = tree.countDescendants(out, r.id); });
  assert.strictEqual(c[22], 11);
  assert.strictEqual(c[75], 3);
  assert.strictEqual(c[74], 1);
});

test('toDepthFirstRows: parent tak ada di daftar = root, cycle tidak buang baris', () => {
  const rows = [
    { id: 5, parentId: 99 },  // parent isVisible=0 -> root
    { id: 6, parentId: 5 },
    { id: 7, parentId: 6 },   // membentuk referensi ke depan
  ];
  const out = tree.toDepthFirstRows(rows);
  assert.strictEqual(out.length, 3);
  assert.deepStrictEqual(out.map(r => r.id), [5, 6, 7]);
  const d = tree.computeDepth(out);
  assert.strictEqual(d[5], 0);
  assert.strictEqual(d[6], 1);
  assert.strictEqual(d[7], 2);
});

test('collectAncestors: rantai leluhur lengkap', () => {
  assert.deepStrictEqual(tree.collectAncestors(ROWS, 111).sort((a, b) => a - b), [1, 11]);
  assert.deepStrictEqual(tree.collectAncestors(ROWS, 1), []);
  assert.deepStrictEqual(tree.collectAncestors(ROWS, 31), [3]);
});

test('normalizeState: nilai kosong jadi 0 semua', () => {
  const out = tree.normalizeState({ 5: {}, 6: { read: '1', create: undefined } });
  assert.deepStrictEqual(out[5], { read: 0, create: 0, update: 0, delete: 0, inactive: 0 });
  assert.deepStrictEqual(out[6], { read: 1, create: 0, update: 0, delete: 0, inactive: 0 });
});

test('Kontrak ekspor roles-permission-tree.js', () => {
  for (const fn of ['collectDescendants', 'collectAncestors', 'childIds', 'descendantsWithAnyRight',
    'applyCascade', 'applyRevoke', 'normalizeState', 'toDepthFirstRows', 'computeDepth', 'countDescendants', 'initRolesPermissionTree']) {
    assert.ok(tree[fn] !== undefined, fn + ' harus diekspor');
  }
});

test('initRolesPermissionTree: no-op aman di Node (tanpa document)', () => {
  assert.strictEqual(tree.initRolesPermissionTree(), null);
});
