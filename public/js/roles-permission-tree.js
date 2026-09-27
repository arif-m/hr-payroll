/**
 * roles-permission-tree.js
 *
 * Cascade logic untuk form edit Roles Permission (tree-table).
 *
 * Aturan:
 *  1. Parent -> anak   : centang hak apa pun di parent menyalakan hak yang sama
 *                        di SEMUA keturunannya (multi-level).
 *  2. Anak -> parent   : centang hak apa pun di anak menyalakan READ di parent,
 *                        kakek, dst. (aturan sidebar: anak tak tampil bila
 *                        parent tidak readable).
 *  3. Uncheck READ parent menghapus semua hak keturunannya (TANPA dialog —
 *     bisa di-undo dengan centang ulang karena cascade-nya deterministik).
 *
 * Interaksi UI (wiring DOM):
 *  - Expand/collapse LEBEB: tombol caret di setiap parent membuka/menutup
 *    cabangnya kapan saja, TIDAK terikat status Read. Status terakhir
 *    dipertahankan saat cascade menjalankan.
 *  - Centang parent otomatis membuka cabangnya agar anak-anak terlihat.
 *
 * Fungsi murni (applyCascade/collectDescendants/applyRevoke) TIDAK menyentuh
 * DOM supaya bisa di-unit-test dari Node; initRolesPermissionTree() yang
 * menghubungkannya ke halaman (dipanggil otomatis saat di browser).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RolesPermissionTree = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RIGHTS = ['read', 'create', 'update', 'delete', 'inactive'];

  /** Map moduleId -> parentId (0 / null untuk root). */
  function buildParentMap(rows) {
    var parentOf = {};
    rows.forEach(function (r) {
      parentOf[r.id] = r.parentId || 0;
    });
    parentOf[0] = 0;
    return parentOf;
  }

  /** Kumpulkan semua keturunan (anak, cucu, ...) dari sebuah id. */
  function collectDescendants(rows, rootId) {
    var childOf = {};
    rows.forEach(function (r) {
      var p = r.parentId || 0;
      if (!childOf[p]) childOf[p] = [];
      childOf[p].push(r.id);
    });
    var out = [];
    var stack = (childOf[rootId] || []).slice();
    var guard = 0;
    while (stack.length && guard < 10000) {
      guard += 1;
      var id = stack.pop();
      if (id === rootId) continue;
      out.push(id);
      var kids = childOf[id] || [];
      for (var i = 0; i < kids.length; i++) stack.push(kids[i]);
    }
    return out;
  }

  /** Set id semua leluhur (parent, kakek, ...) — tanpa id sendiri. */
  function collectAncestors(rows, id) {
    var parentOf = buildParentMap(rows);
    var out = [];
    var cur = parentOf[id];
    var guard = 0;
    while (cur && cur !== 0 && guard < 1000) {
      guard += 1;
      out.push(cur);
      cur = parentOf[cur];
    }
    return out;
  }

  /**
   * Terapkan cascade ke state map { [moduleId]: {read,create,update,delete,inactive} }.
   * Pure: mengembalikan objek baru.
   * steps: [{id, right, on:true|false}] — satu step per interaksi klik.
   */
  function applyCascade(rows, state, steps) {
    var parentOf = buildParentMap(rows);
    var next = {};
    Object.keys(state).forEach(function (id) {
      next[id] = Object.assign({}, state[id]);
    });

    (steps || []).forEach(function (step) {
      var id = step.id;
      var right = step.right;
      var on = step.on ? 1 : 0;
      if (!next[id]) next[id] = { read: 0, create: 0, update: 0, delete: 0, inactive: 0 };
      next[id][right] = on;

      if (on) {
        // (1) parent ON -> semua keturunan ikut ON untuk hak yang sama.
        collectDescendants(rows, id).forEach(function (descId) {
          if (!next[descId]) next[descId] = { read: 0, create: 0, update: 0, delete: 0, inactive: 0 };
          next[descId][right] = 1;
        });
        // (2) anak ON -> naikkan READ ke semua leluhur.
        collectAncestors(rows, id).forEach(function (ancId) {
          if (!next[ancId]) next[ancId] = { read: 0, create: 0, update: 0, delete: 0, inactive: 0 };
          next[ancId].read = 1;
        });
      } else if (right === 'read') {
        // (3) READ parent OFF -> semua keturunan kehilangan SEMUA hak.
        applyRevoke(rows, next, id);
      }
      // Uncheck hak non-read pada parent: anak dibiarkan (kombinasi partial
      // pada anak sah); READ tetap yang mengikat tampilan sidebar.
    });

    return next;
  }

  /** Kosongkan semua hak pada keturunan id. Pure. */
  function applyRevoke(rows, state, rootId) {
    collectDescendants(rows, rootId).forEach(function (descId) {
      if (state[descId]) {
        state[descId] = { read: 0, create: 0, update: 0, delete: 0, inactive: 0 };
      }
    });
    return state;
  }

  /**
   * Bersihkan baris kosong: baris tanpa hak apa pun menjadi 0 semua —
   * dipanggil sebelum submit agar hidden inputs konsisten.
   */
  function normalizeState(state) {
    var out = {};
    Object.keys(state).forEach(function (id) {
      var v = state[id] || {};
      out[id] = {
        read: Number(v.read) || 0,
        create: Number(v.create) || 0,
        update: Number(v.update) || 0,
        delete: Number(v.delete) || 0,
        inactive: Number(v.inactive) || 0
      };
    });
    return out;
  }

  /**
   * Urutkan baris depth-first: parent langsung diikuti SELURUH keturunannya
   * sebelum sibling berikutnya. Data DB berurutan global by `sequence`, sehingga
   * anak dan keponakan bisa berselang-seli — fungsi ini merapikannya untuk
   * tampilan tree. Baris dengan parent yang tidak ada dalam daftar (mis. parent
   * isVisible=0) diperlakukan sebagai root. Jumlah baris dijamin sama.
   */
  function toDepthFirstRows(rows) {
    var idSet = {};
    rows.forEach(function (r) { idSet[r.id] = true; });
    var childOf = {};
    var roots = [];
    rows.forEach(function (r) {
      var p = r.parentId || 0;
      if (!p || !idSet[p]) roots.push(r);
      else {
        if (!childOf[p]) childOf[p] = [];
        childOf[p].push(r);
      }
    });
    var out = [];
    var emitted = {};
    (function walk(list) {
      list.forEach(function (r) {
        if (emitted[r.id]) return;
        emitted[r.id] = true;
        out.push(r);
        walk(childOf[r.id] || []);
      });
    })(roots);
    // Safety net: sisa (mis. cycle data) tetap masuk agar tak ada baris hilang.
    rows.forEach(function (r) {
      if (!emitted[r.id]) { emitted[r.id] = true; out.push(r); }
    });
    return out;
  }

  /** Kedalaman baris dari data (indentasi). Parent di luar daftar = root. */
  function computeDepth(rows) {
    var byId = {};
    rows.forEach(function (r) { byId[r.id] = true; });
    var parentOf = {};
    rows.forEach(function (r) { parentOf[r.id] = r.parentId || 0; });
    var depthOf = {};
    rows.forEach(function (r) {
      var d = 0;
      var cur = r.parentId || 0;
      var guard = 0;
      while (cur && byId[cur] && guard < 100) {
        guard += 1;
        d += 1;
        cur = parentOf[cur];
      }
      depthOf[r.id] = d;
    });
    return depthOf;
  }

  /** Jumlah keturunan (untuk menentukan baris parent di view). */
  function countDescendants(rows, rootId) {
    return collectDescendants(rows, rootId).length;
  }

  /** Daftar id anak langsung (urut sesuai data) — dipakai wiring & test. */
  function childIds(rows, rootId) {
    return rows.filter(function (r) { return (r.parentId || 0) === rootId; })
      .map(function (r) { return r.id; });
  }

  /** Semua id keturunan yang punya setidaknya satu hak ON. */
  function descendantsWithAnyRight(rows, state, rootId) {
    return collectDescendants(rows, rootId).filter(function (id) {
      var s = state[id];
      return s && (s.read || s.create || s.update || s.delete || s.inactive);
    });
  }

  /**
   * Wiring DOM. Dipanggil otomatis di browser; di Node no-op (return null).
   * Struktur yang diharapkan (dirender oleh views/pages/roles-permission/edit.ejs):
   *   tr.rp-row[data-module-id][data-parent-id]
   *   input.rp-toggle[data-module-id][data-right]
   *   a.rp-toggle-tree di baris parent
   */
  function initRolesPermissionTree(opts) {
    if (typeof document === 'undefined') return null;

    opts = opts || {};
    var form = opts.form || document.getElementById('rpForm') || document.querySelector('form');
    if (!form) return null;

    var rows = [];
    var rowsById = {};
    Array.prototype.forEach.call(form.querySelectorAll('tr.rp-row'), function (tr) {
      var id = Number(tr.getAttribute('data-module-id'));
      var row = {
        id: id,
        parentId: Number(tr.getAttribute('data-parent-id')) || 0,
        el: tr,
        readRight: 0
      };
      rows.push(row);
      rowsById[id] = row;
    });
    if (!rows.length) return null;

    // ---- Visibility handling: PARENT yang mengontrol cabangnya ----
    // expanded[id] = true bila cabang parent terbuka. Default: cabang dengan
    // anak berhak apa pun terbuka, lainnya tertutup.
    var expanded = {};
    function defaultExpanded() {
      rows.forEach(function (r) {
        expanded[r.id] = descendantsWithAnyRight(rows, currentState || {}, r.id).length > 0;
      });
    }

    // Visibilitas baris = SEMUA leluhur terbuka (dihitung top-down agar
    // cabang dalam yang ditutup tetap tertutup meski induknya dibuka).
    function rowVisible(id) {
      var anc = collectAncestors(rows, id).reverse(); // root dulu
      for (var i = 0; i < anc.length; i++) {
        if (!expanded[anc[i]]) return false;
      }
      return true;
    }

    function applyAllVisibility() {
      rows.forEach(function (r) {
        r.el.classList.toggle('d-none', !rowVisible(r.id));
      });
      rows.forEach(function (r) {
        var btn = r.el.querySelector('.rp-toggle-tree');
        if (!btn) return;
        btn.classList.toggle('collapsed', !expanded[r.id]);
        btn.setAttribute('aria-expanded', expanded[r.id] ? 'true' : 'false');
      });
    }

    // ---- State <-> checkbox ----
    var currentState = null;

    function readState() {
      var state = {};
      rows.forEach(function (r) {
        state[r.id] = { read: 0, create: 0, update: 0, delete: 0, inactive: 0 };
      });
      Array.prototype.forEach.call(form.querySelectorAll('input.rp-toggle'), function (cb) {
        var id = Number(cb.getAttribute('data-module-id'));
        var right = cb.getAttribute('data-right');
        if (state[id] && RIGHTS.indexOf(right) !== -1) {
          state[id][right] = cb.checked ? 1 : 0;
        }
      });
      rows.forEach(function (r) {
        if (state[r.id]) r.readRight = state[r.id].read ? 1 : 0;
      });
      currentState = state;
      return state;
    }

    var hiddenNames = {
      read: 'readRight', create: 'createRight', update: 'updateRight',
      delete: 'deleteRight', inactive: 'inactiveRight'
    };
    function writeState(state) {
      rows.forEach(function (r) {
        var s = state[r.id];
        if (!s) return;
        r.readRight = s.read ? 1 : 0;
        RIGHTS.forEach(function (right) {
          var val = s[right] ? 1 : 0;
          var cb = r.el.querySelector('input.rp-toggle[data-module-id="' + r.id + '"][data-right="' + right + '"]');
          if (cb) {
            cb.checked = val === 1;
            cb.value = val;
          }
          var hidden = r.el.querySelector('input[name="' + hiddenNames[right] + '"][data-module-id="' + r.id + '"]');
          if (hidden) hidden.value = val;
        });
      });
      currentState = state;
    }

    // ---- Interaksi checkbox: TANPA dialog apa pun ----
    Array.prototype.forEach.call(form.querySelectorAll('input.rp-toggle'), function (cb) {
      cb.addEventListener('change', function () {
        var id = Number(cb.getAttribute('data-module-id'));
        var right = cb.getAttribute('data-right');
        var on = !!cb.checked;

        var next = applyCascade(rows, readState(), [{ id: id, right: right, on: on }]);
        writeState(next);

        // Centang parent -> buka cabangnya agar anak-anak langsung terlihat.
        if (on && countDescendants(rows, id) > 0) {
          expanded[id] = true;
        }
        applyAllVisibility();
      });
    });

    // ---- Expand/collapse bebas via caret (tidak terikat Read) ----
    Array.prototype.forEach.call(form.querySelectorAll('.rp-toggle-tree'), function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var tr = btn.closest('tr.rp-row');
        if (!tr) return;
        var id = Number(tr.getAttribute('data-module-id'));
        expanded[id] = !expanded[id];
        applyAllVisibility();
      });
    });

    // ---- Sinkronkan hidden inputs sebelum submit ----
    form.addEventListener('submit', function () {
      writeState(normalizeState(readState()));
    });

    readState();
    defaultExpanded();
    applyAllVisibility();
    return {
      readState: readState,
      writeState: writeState,
      applyAllVisibility: applyAllVisibility,
      expanded: expanded
    };
  }

  // Auto-init di browser.
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { initRolesPermissionTree(); });
    } else {
      initRolesPermissionTree();
    }
  }

  return {
    RIGHTS: RIGHTS,
    buildParentMap: buildParentMap,
    collectDescendants: collectDescendants,
    collectAncestors: collectAncestors,
    childIds: childIds,
    descendantsWithAnyRight: descendantsWithAnyRight,
    applyCascade: applyCascade,
    applyRevoke: applyRevoke,
    normalizeState: normalizeState,
    toDepthFirstRows: toDepthFirstRows,
    computeDepth: computeDepth,
    countDescendants: countDescendants,
    initRolesPermissionTree: initRolesPermissionTree
  };
});
