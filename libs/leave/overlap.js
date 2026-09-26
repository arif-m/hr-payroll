/**
 * overlap.js — validasi anti-overlap pengajuan cuti LINTAS-JENIS.
 *
 * Latar: approval cuti menulis baris timeAttendance (unique employeeId+workDate)
 * untuk kebutuhan payroll. Dua pengajuan yang beririsan akan bentrok di titik
 * approval (guard "time attendance already exist"). Maka di titik SUBMIT kita
 * cegah sejak awal: satu karyawan tidak boleh punya 2+ pengajuan cuti (jenis
 * apa pun) dengan periode beririsan, kecuali pengajuan lama sudah DITOLAK.
 * Medreimb tidak ikut — tidak menulis tabel absensi.
 */
const moment = require('moment');

const TYPE_NAMES = { 1: 'Annual Leave', 2: 'Sick Leave', 3: 'Sick Leave 2', 4: 'Unpaid Leave' };

/** Dua interval inklusif [s1,e1] dan [s2,e2] beririsan? (string YYYY-MM-DD) */
function intervalsOverlap(s1, e1, s2, e2) {
  return s1 <= e2 && e1 >= s2;
}

/**
 * Cari pengajuan cuti karyawan yang beririsan dengan [start, end].
 * - start/end: Date (atau apa pun yang bisa dibaca moment).
 * - Rejected dianggap tidak menghalangi:
 *     requestLeave  -> isApproved == 2 ATAU isApprovedByHR == 2 (ditolak di jenjang mana pun)
 *     requestOtherLeave -> isApproved == 2 (ditolak SPV)
 * - Return: [{ source: 'leave'|'other', id, kindLabel, typeName, start, end, statusLabel }]
 */
async function findOverlaps(prisma, { employeeId, start, end }) {
  const s = moment.utc(start).format('YYYY-MM-DD');
  const e = moment.utc(end).format('YYYY-MM-DD');
  const out = [];

  const leaves = await prisma.requestLeave.findMany({
    where: {
      employeeId: Number(employeeId),
      AND: [
        { startDuration: { lte: moment.utc(e).toDate() } },
        { endDuration: { gte: moment.utc(s).toDate() } },
        // request "mati" (ditolak) di jenjang mana pun tidak menghalangi:
        // SPV reject -> isApproved=2; HR reject -> isApprovedByHR=2
        { isApproved: { not: 2 } },
        { isApprovedByHR: { not: 2 } },
      ],
    },
    select: { id: true, leaveType: true, startDuration: true, endDuration: true, isApproved: true, isApprovedByHR: true },
  });
  for (const r of leaves) {
    const statusLabel = r.isApprovedByHR === 1 ? 'Disetujui (final)' : (r.isApproved === 1 ? 'Disetujui SPV' : 'Menunggu persetujuan');
    out.push({
      source: 'leave',
      id: r.id,
      kindLabel: TYPE_NAMES[r.leaveType] || 'Leave',
      typeName: TYPE_NAMES[r.leaveType] || 'Leave',
      start: moment.utc(r.startDuration).format('YYYY-MM-DD'),
      end: moment.utc(r.endDuration).format('YYYY-MM-DD'),
      statusLabel,
    });
  }

  const others = await prisma.requestOtherLeave.findMany({
    where: {
      employeeId: Number(employeeId),
      AND: [
        { startDuration: { lte: moment.utc(e).toDate() } },
        { endDuration: { gte: moment.utc(s).toDate() } },
      ],
      isApproved: { not: 2 },
    },
    select: { id: true, startDuration: true, endDuration: true, isApproved: true, otherleaveTypeDescription: true },
  });
  for (const r of others) {
    out.push({
      source: 'other',
      id: r.id,
      kindLabel: 'Other Leave',
      typeName: r.otherleaveTypeDescription || 'Other Leave',
      start: moment.utc(r.startDuration).format('YYYY-MM-DD'),
      end: moment.utc(r.endDuration).format('YYYY-MM-DD'),
      statusLabel: r.isApproved === 1 ? 'Disetujui SPV' : 'Menunggu persetujuan',
    });
  }

  return out;
}

/** Pesan flash dari hasil findOverlaps. */
function buildOverlapMessage(overlaps) {
  const detail = overlaps
    .map((o) => o.kindLabel + ' (' + o.start + ' s/d ' + o.end + ', ' + o.statusLabel + ')')
    .join('; ');
  return 'Sudah ada pengajuan cuti lain yang beririsan pada tanggal tersebut: ' + detail +
    '. Ajukan dengan periode yang tidak tumpang tindih, atau tunggu keputusan pengajuan sebelumnya.';
}

module.exports = { intervalsOverlap, findOverlaps, buildOverlapMessage, TYPE_NAMES };
