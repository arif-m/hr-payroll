/**
 * run-state.js — aturan status PayrollRun (pure functions, tanpa DB).
 * Dipisahkan dari run.js agar persist.js bisa memakai guard tanpa
 * circular dependency (run.js ↔ persist.js).
 *
 * Status: DRAFT → SUBMITTED → APPROVED → LOCKED (SUBMITTED bisa kembali DRAFT).
 */

/** Transisi status yang sah. */
const TRANSITIONS = {
  submit:      { from: ['DRAFT'],     to: 'SUBMITTED' },
  approve:     { from: ['SUBMITTED'], to: 'APPROVED'  },
  lock:        { from: ['APPROVED'],  to: 'LOCKED'    },
  backToDraft: { from: ['SUBMITTED'], to: 'DRAFT'     },
};

function assertTransition(currentStatus, action) {
  const t = TRANSITIONS[action];
  if (!t) throw new Error(`Aksi tidak dikenal: ${action}`);
  if (!t.from.includes(currentStatus)) {
    throw new Error(`Tidak bisa ${action}: run sedang berstatus ${currentStatus} (harus ${t.from.join(' atau ')})`);
  }
  return t.to;
}

/** Run harus berstatus DRAFT agar payslip boleh ditulis. */
function assertRunWritable(run) {
  if (!run) throw new Error('Payroll run tidak ditemukan');
  if (run.status !== 'DRAFT') {
    throw new Error(`Payroll run sudah ${run.status} — payslip tidak bisa digenerate/dikoreksi lagi`);
  }
}

module.exports = { TRANSITIONS, assertTransition, assertRunWritable };
