/**
 * payment-file.js — CSV pembayaran gaji per bank dari payroll run APPROVED/LOCKED.
 *
 * Format generik (1 baris per karyawan, dikelompokkan per bank):
 *   Bank, No Rekening, Nama Pemilik Rekening, Nama Karyawan, Employee ID,
 *   Jumlah (THP), Keterangan
 *
 * Karyawan tanpa data rekening dilewati dan dilaporkan pada `skipped`
 * agar HR bisa melengkapi datanya sebelum transfer.
 */
const prisma = require('../prisma');

/** Escape satu field CSV (quote bila mengandung koma/kutip/baris baru). */
function csvField(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Bangun isi CSV payment file untuk satu payroll run.
 * @param {Number} runId
 * @returns {Promise<{run: Object, csv: String, skipped: Array<{fullName: String, reason: String}>, count: Number, totalAmount: Number}>}
 */
async function buildPaymentFile(runId) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: Number(runId) },
    include: {
      cutOffPeriod: { select: { monthPeriod: true, yearPeriod: true } },
      runDetail: { where: { status: 'OK' }, orderBy: { fullName: 'asc' } },
    },
  });
  if (!run) throw new Error('Payroll run tidak ditemukan');
  if (!['APPROVED', 'LOCKED'].includes(run.status)) {
    throw new Error(`Payment file hanya tersedia untuk run APPROVED/LOCKED (run ini ${run.status})`);
  }

  const usersIds = run.runDetail.map((d) => d.usersId);
  const users = await prisma.users.findMany({
    where: { id: { in: usersIds } },
    select: { id: true, employeeId: true, fullName: true, bankName: true, bankAccountNumber: true, bankAccountHolder: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const header = 'Bank,No Rekening,Nama Pemilik Rekening,Nama Karyawan,Employee ID,Jumlah (THP),Keterangan';
  const skipped = [];
  const rows = [];

  // Urutkan per bank agar mudah di-split per batch transfer.
  const sorted = [...run.runDetail].sort((a, b) => {
    const ba = (userById.get(a.usersId)?.bankName || '').localeCompare(userById.get(b.usersId)?.bankName || '');
    return ba !== 0 ? ba : a.fullName.localeCompare(b.fullName);
  });

  for (const d of sorted) {
    const u = userById.get(d.usersId);
    if (!u || !u.bankName || !u.bankAccountNumber) {
      skipped.push({ fullName: d.fullName, reason: 'belum ada data bank/no. rekening' });
      continue;
    }
    rows.push([
      u.bankName.trim().toUpperCase(),
      u.bankAccountNumber.trim(),
      (u.bankAccountHolder || u.fullName).trim(),
      d.fullName,
      String(u.employeeId),
      Number(d.thpAmount).toFixed(2),
      `Payroll ${run.cutOffPeriod.monthPeriod}/${run.cutOffPeriod.yearPeriod}`,
    ].map(csvField).join(','));
  }

  const csv = [header, ...rows].join('\r\n') + '\r\n';
  const totalAmount = rows.length
    ? sorted
        .filter((d) => { const u = userById.get(d.usersId); return u && u.bankName && u.bankAccountNumber; })
        .reduce((a, d) => a + Number(d.thpAmount), 0)
    : 0;

  return { run, csv, skipped, count: rows.length, totalAmount };
}

module.exports = { buildPaymentFile, csvField };
