/**
 * payment-status.js — status pembayaran gaji per payroll run & per karyawan.
 *
 * Sumber kebenaran pembayaran adalah TRANCHE (tabel payrollRunPayment):
 * cicilan/termin per karyawan. Status PAID/PARTIAL/UNPAID — level baris dan
 * level run — diturunkan dari akumulasi amount tranche vs thpAmount, lalu
 * di-cache ke kolom paymentStatus (runDetail & payrollRun) setiap mutasi.
 *
 * Level baris: PAID bila terbayar >= THP; PARTIAL bila 0 < terbayar < THP;
 *              UNPAID bila belum ada tranche.
 * Level run  : PAID bila semua baris OK paid; PARTIAL bila sebagian;
 *              UNPAID bila nihil. Baris FAILED diabaikan.
 *
 * Guard: hanya run APPROVED/LOCKED yang boleh mencatat pembayaran. Pembayaran
 * penuh (markRunPaid/markEmployeesPaid) kini membuat tranche sebesar sisa
 * THP; pembatalan menghapus tranche terkait.
 */
const prisma = require('../prisma');

const RUN_STATUSES_ALLOW_PAYMENT = ['APPROVED', 'LOCKED'];

/**
 * Derive status pembayaran SATU baris dari total terbayar vs THP (murni).
 * @param {Number} paidTotal - akumulasi tranche baris tsb
 * @param {Number} thpAmount
 * @returns {'UNPAID'|'PARTIAL'|'PAID'}
 */
function deriveRowPaymentStatus(paidTotal, thpAmount) {
  const paid = Number(paidTotal) || 0;
  const thp = Number(thpAmount) || 0;
  if (paid <= 0) return 'UNPAID';
  if (paid + 1e-6 >= thp) return 'PAID';
  return 'PARTIAL';
}

/**
 * Derive status pembayaran RUN dari daftar baris berbasis nominal (murni).
 * Baris FAILED diabaikan. PAID bila semua baris OK paid; PARTIAL bila
 * sebagian; UNPAID bila nihil.
 * @param {Array<{status: String, thpAmount: Number, paidTotal: Number}>} details
 * @returns {'UNPAID'|'PARTIAL'|'PAID'}
 */
function deriveRunPaymentStatusFromAmounts(details) {
  const okRows = (details || []).filter((d) => d.status === 'OK');
  if (okRows.length === 0) return 'UNPAID';
  const statuses = okRows.map((d) => deriveRowPaymentStatus(d.paidTotal, d.thpAmount));
  if (statuses.every((s) => s === 'PAID')) return 'PAID';
  if (statuses.some((s) => s !== 'UNPAID')) return 'PARTIAL';
  return 'UNPAID';
}

/**
 * Back-compat: derive status run dari baris. Menerima format lama
 * ({status, paymentStatus}) maupun baru ({status, thpAmount, paidTotal}).
 */
function deriveRunPaymentStatus(details) {
  const normalized = (details || []).map((d) => ({
    status: d.status,
    thpAmount: d.thpAmount !== undefined ? d.thpAmount : 0,
    paidTotal: d.paidTotal !== undefined
      ? d.paidTotal
      : (d.paymentStatus === 'PAID' ? 1 : 0), // 1 = penuh, 0 = tidak
  }));
  return deriveRunPaymentStatusFromAmounts(normalized);
}

/**
 * Jumlahkan tranche per usersId → map { [usersId]: paidTotal } (murni).
 * @param {Array<{usersId: Number, amount: Number|String|BigInt}>} payments
 * @returns {Object}
 */
function sumPaymentsByUser(payments) {
  const map = {};
  for (const p of payments || []) {
    const key = String(p.usersId);
    map[key] = (map[key] || 0) + Number(p.amount);
  }
  return map;
}

/**
 * Muat run + detail (termasuk tranche); lempar bila run tidak ada atau
 * belum APPROVED/LOCKED.
 */
async function getRunnableOrThrow(runId) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: Number(runId) },
    include: {
      runDetail: {
        orderBy: { fullName: 'asc' },
        include: { payments: { orderBy: [{ paidAt: 'asc' }, { id: 'asc' }] } },
      },
    },
  });
  if (!run) throw new Error('Payroll run tidak ditemukan');
  if (!RUN_STATUSES_ALLOW_PAYMENT.includes(run.status)) {
    throw new Error(`Status pembayaran hanya untuk run APPROVED/LOCKED (run ini ${run.status})`);
  }
  return run;
}

/** Sisa THP satu baris (THP - akumulasi tranche), dibatasi >= 0. */
function getRemainingThp(detail, paidTotal) {
  const remaining = Number(detail.thpAmount) - (paidTotal !== undefined ? Number(paidTotal) : sumPaidOf(detail));
  return Math.max(0, remaining);
}

function sumPaidOf(detail) {
  return (detail.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
}

/**
 * Recompute kolom cache satu baris (paymentStatus/paidAt/paymentNote) dari
 * tranche-nya, lalu derive ulang status run + audit. Dipanggil di dalam tx.
 * @private
 */
async function recomputeRowAndRun(tx, run, detail, actor, note) {
  const paidTotal = sumPaidOf(detail);
  const rowStatus = deriveRowPaymentStatus(paidTotal, detail.thpAmount);
  const lastPayment = (detail.payments || []).slice(-1)[0] || null;

  await tx.payrollRunDetail.update({
    where: { id: detail.id },
    data: {
      paymentStatus: rowStatus,
      paidAt: rowStatus === 'UNPAID' ? null : (lastPayment ? lastPayment.paidAt : new Date()),
      paymentNote: rowStatus === 'UNPAID' ? null : (lastPayment ? (lastPayment.note || `${lastPayment.method || 'Pembayaran'} ${Number(lastPayment.amount)}`) : null),
    },
  });

  // Derive ulang status run dari seluruh baris (dengan tranche terbaru).
  const rows = await tx.payrollRunDetail.findMany({
    where: { payrollRunId: run.id },
    select: { status: true, thpAmount: true, payments: { select: { amount: true } } },
  });
  const derived = deriveRunPaymentStatusFromAmounts(rows.map((r) => ({
    status: r.status,
    thpAmount: r.thpAmount,
    paidTotal: (r.payments || []).reduce((a, p) => a + Number(p.amount), 0),
  })));
  const now = new Date();
  await tx.payrollRun.update({
    where: { id: run.id },
    data: {
      paymentStatus: derived,
      paymentMarkedAt: derived === 'UNPAID' ? null : now,
      paymentMarkedBy: derived === 'UNPAID' ? null : (actor || run.paymentMarkedBy),
      paymentNote: note !== undefined ? note : run.paymentNote,
    },
  });
  return { rowStatus, runStatus: derived, paidTotal };
}

/**
 * Catat satu tranche (cicilan/termin) untuk satu karyawan pada run.
 * Validasi: baris ada & OK, amount > 0, total tidak melebihi THP.
 * @param {Number} runId
 * @param {Number} usersId
 * @param {Object} opts
 * @param {Number|String} opts.amount - nominal tranche (> 0, <= sisa THP)
 * @param {String} [opts.method] - mis. 'Transfer', 'Cash'
 * @param {String} [opts.note]
 * @param {String} [opts.paidAt] - ISO date (default: sekarang)
 * @param {String} opts.actor - fullName user
 * @returns {Promise<{rowStatus, runStatus, paidTotal, remaining, tranche}>}
 */
async function addPaymentTranche(runId, usersId, { amount, method, note, paidAt, actor }) {
  const run = await getRunnableOrThrow(runId);
  const uid = Number(usersId);
  const detail = run.runDetail.find((d) => d.usersId === uid);
  if (!detail) throw new Error('Karyawan tidak ditemukan pada run ini');
  if (detail.status !== 'OK') throw new Error(`Baris ${detail.fullName} berstatus ${detail.status} — tidak bisa dibayar`);

  const value = Number(String(amount).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) throw new Error('Nominal cicilan harus lebih dari 0');

  const existing = sumPaidOf(detail);
  const remaining = Number(detail.thpAmount) - existing;
  if (value - 1e-6 > remaining) {
    throw new Error(`Nominal melebihi sisa THP (sisa Rp ${remaining.toLocaleString('id-ID')})`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const tranche = await tx.payrollRunPayment.create({
      data: {
        payrollRunId: run.id,
        usersId: uid,
        fullName: detail.fullName,
        amount: value,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        method: method || null,
        note: note || null,
        createdBy: actor,
        updatedBy: actor,
      },
    });
    const fresh = await tx.payrollRunDetail.findUnique({
      where: { id: detail.id },
      include: { payments: { orderBy: [{ paidAt: 'asc' }, { id: 'asc' }] } },
    });
    const rec = await recomputeRowAndRun(tx, run, fresh, actor, note || null);
    return { tranche, ...rec };
  });

  return {
    rowStatus: result.rowStatus,
    runStatus: result.runStatus,
    paidTotal: result.paidTotal,
    remaining: Math.max(0, Number(detail.thpAmount) - result.paidTotal),
    tranche: result.tranche,
  };
}

/**
 * Batalkan (hapus) satu tranche, lalu derive ulang status baris & run.
 * @param {Number} runId
 * @param {Number} trancheId
 * @param {String} actor
 * @returns {Promise<{rowStatus, runStatus, paidTotal, remaining}>}
 */
async function cancelPaymentTranche(runId, trancheId, actor) {
  const run = await getRunnableOrThrow(runId);
  const tranche = await prisma.payrollRunPayment.findUnique({
    where: { id: Number(trancheId) },
  });
  if (!tranche || tranche.payrollRunId !== run.id) {
    throw new Error('Tranche tidak ditemukan pada run ini');
  }
  const detail = run.runDetail.find((d) => d.usersId === tranche.usersId);
  if (!detail || detail.status !== 'OK') {
    throw new Error('Baris karyawan tranche ini tidak berstatus OK');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.payrollRunPayment.delete({ where: { id: tranche.id } });
    const fresh = await tx.payrollRunDetail.findUnique({
      where: { id: detail.id },
      include: { payments: { orderBy: [{ paidAt: 'asc' }, { id: 'asc' }] } },
    });
    return recomputeRowAndRun(tx, run, fresh, actor, null);
  });

  return {
    rowStatus: result.rowStatus,
    runStatus: result.runStatus,
    paidTotal: result.paidTotal,
    remaining: Math.max(0, Number(detail.thpAmount) - result.paidTotal),
  };
}

/**
 * Tandai SELURUH karyawan berstatus OK pada run sebagai PAID — kini dengan
 * membuat tranche sebesar sisa THP tiap baris (jejak audit tetap utuh).
 * paid=false menghapus SEMUA tranche run (kembali UNPAID penuh).
 * @param {Number} runId
 * @param {String} actor - fullName user yang menandai
 * @param {String} [note] - catatan opsional (mis. "transfer BRI batch #12")
 * @param {Boolean} [paid=true] - false = batalkan (hapus semua tranche)
 * @returns {Promise<{run: Object, paidCount: Number, runPaymentStatus: String}>}
 */
async function markRunPaid(runId, actor, note, paid = true) {
  const run = await getRunnableOrThrow(runId);
  const okRows = run.runDetail.filter((d) => d.status === 'OK');

  if (!paid) {
    // Batalkan semua: hapus seluruh tranche run → derive menghasilkan UNPAID.
    await prisma.$transaction(async (tx) => {
      await tx.payrollRunPayment.deleteMany({ where: { payrollRunId: run.id } });
      await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          paymentStatus: 'UNPAID',
          paymentMarkedAt: null,
          paymentMarkedBy: null,
          paymentNote: null,
        },
      });
      await tx.payrollRunDetail.updateMany({
        where: { payrollRunId: run.id },
        data: { paymentStatus: 'UNPAID', paidAt: null, paymentNote: null },
      });
    });
    return { run: await prisma.payrollRun.findUnique({ where: { id: run.id } }), paidCount: 0, runPaymentStatus: 'UNPAID' };
  }

  let created = 0;
  await prisma.$transaction(async (tx) => {
    for (const detail of okRows) {
      const existing = sumPaidOf(detail);
      const remaining = Number(detail.thpAmount) - existing;
      if (remaining <= 1e-6) continue; // sudah lunas
      await tx.payrollRunPayment.create({
        data: {
          payrollRunId: run.id,
          usersId: detail.usersId,
          fullName: detail.fullName,
          amount: remaining,
          paidAt: new Date(),
          method: 'FULL',
          note: note || null,
          createdBy: actor,
          updatedBy: actor,
        },
      });
      created += 1;
    }
    // Refresh kolom cache seluruh baris + derive status run.
    const rows = await tx.payrollRunDetail.findMany({
      where: { payrollRunId: run.id },
      include: { payments: { orderBy: [{ paidAt: 'asc' }, { id: 'asc' }] } },
    });
    for (const row of rows) {
      if (row.status !== 'OK') continue;
      await recomputeRowAndRun(tx, run, row, actor, note || null);
    }
    await tx.payrollRun.update({
      where: { id: run.id },
      data: { paymentStatus: 'PAID', paymentMarkedAt: new Date(), paymentMarkedBy: actor, paymentNote: note || null },
    });
  });

  return {
    run: await prisma.payrollRun.findUnique({ where: { id: run.id } }),
    paidCount: okRows.length,
    runPaymentStatus: 'PAID',
  };
}

/**
 * Tandai sebagian karyawan pada run (per baris) sebagai lunas — kini membuat
 * tranche sebesar sisa THP tiap baris terpilih. Batalkan dengan paid=false
 * (hapus tranche baris tsb). Baris FAILED diabaikan.
 * @param {Number} runId
 * @param {Array<Number>} usersIds
 * @param {String} actor
 * @param {String} [note]
 * @param {Boolean} [paid=true]
 * @returns {Promise<{run: Object, changed: Number, runPaymentStatus: String}>}
 */
async function markEmployeesPaid(runId, usersIds, actor, note, paid = true) {
  const run = await getRunnableOrThrow(runId);
  const ids = (usersIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) throw new Error('Tidak ada karyawan yang dipilih');

  let changed = 0;
  await prisma.$transaction(async (tx) => {
    const targets = run.runDetail.filter((d) => ids.includes(d.usersId) && d.status === 'OK');
    if (paid) {
      for (const detail of targets) {
        const remaining = Number(detail.thpAmount) - sumPaidOf(detail);
        if (remaining <= 1e-6) continue;
        await tx.payrollRunPayment.create({
          data: {
            payrollRunId: run.id,
            usersId: detail.usersId,
            fullName: detail.fullName,
            amount: remaining,
            paidAt: new Date(),
            method: 'FULL',
            note: note || null,
            createdBy: actor,
            updatedBy: actor,
          },
        });
        changed += 1;
      }
    } else {
      await tx.payrollRunPayment.deleteMany({
        where: { payrollRunId: run.id, usersId: { in: ids } },
      });
      changed = targets.length;
    }
    // Recompute baris terdampak + derive ulang run.
    const rows = await tx.payrollRunDetail.findMany({
      where: { payrollRunId: run.id },
      include: { payments: { orderBy: [{ paidAt: 'asc' }, { id: 'asc' }] } },
    });
    for (const row of rows) {
      if (row.status !== 'OK') continue;
      await recomputeRowAndRun(tx, run, row, actor, note || null);
    }
  });

  const fresh = await prisma.payrollRun.findUnique({ where: { id: run.id } });
  return { run: fresh, changed, runPaymentStatus: fresh.paymentStatus };
}

module.exports = {
  RUN_STATUSES_ALLOW_PAYMENT,
  deriveRowPaymentStatus,
  deriveRunPaymentStatusFromAmounts,
  deriveRunPaymentStatus,
  sumPaymentsByUser,
  getRunnableOrThrow,
  getRemainingThp,
  addPaymentTranche,
  cancelPaymentTranche,
  markRunPaid,
  markEmployeesPaid,
};
