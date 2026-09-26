const prisma = require('../prisma');
const moment = require('moment');
const { stagesForRoleName, kindsForStages } = require('./stages');

/**
 * Approval Inbox — satu halaman menggantikan 13 menu approval yang
 * duplikatif (jenis cuti × jenjang). Jenis × jenjang didefinisikan di sini;
 * tiap entri tahu cara menghitung pending-nya dan POST handler existing
 * yang dipakai (body kompatibel dengan halaman lama).
 */

const KINDS = [
  {
    key: 'annual',
    label: 'Annual Leave',
    table: 'requestLeave',
    leaveType: 1,
    stages: ['SPV', 'HR'],
    detail: (row) => ({
      title: row.leaveTypeDescription || 'Annual Leave',
      period: row.startDuration && row.endDuration
        ? moment(row.startDuration).format('DD-MM-YYYY') + ' s/d ' + moment(row.endDuration).format('DD-MM-YYYY')
        : '-',
      amount: (row.days ?? '-') + ' hari',
    }),
    // Pending SPV: belum ada keputusan supervisor
    pendingSpv: (supervisorId) => prisma.requestLeave.findMany({ where: { leaveType: 1, isApproved: 0, fullName: { supervisor: supervisorId } } }),
    countSpv: (supervisorId) => prisma.requestLeave.count({ where: { leaveType: 1, isApproved: 0, fullName: { supervisor: supervisorId } } }),
    // Pending HR: sudah disetujui SPV, menunggu HR
    pendingHr: () => prisma.requestLeave.findMany({ where: { leaveType: 1, isApproved: 1, isApprovedByHR: 0 } }),
    countHr: () => prisma.requestLeave.count({ where: { leaveType: 1, isApproved: 1, isApprovedByHR: 0 } }),
  },
  {
    key: 'sick',
    label: 'Sick Leave',
    table: 'requestLeave',
    leaveType: 2,
    stages: ['SPV', 'HR'],
    detail: (row) => ({
      title: row.leaveTypeDescription || 'Sick Leave',
      period: row.startDuration && row.endDuration
        ? moment(row.startDuration).format('DD-MM-YYYY') + ' s/d ' + moment(row.endDuration).format('DD-MM-YYYY')
        : '-',
      amount: (row.days ?? '-') + ' hari',
    }),
    pendingSpv: (supervisorId) => prisma.requestLeave.findMany({ where: { leaveType: 2, isApproved: 0, fullName: { supervisor: supervisorId } } }),
    countSpv: (supervisorId) => prisma.requestLeave.count({ where: { leaveType: 2, isApproved: 0, fullName: { supervisor: supervisorId } } }),
    pendingHr: () => prisma.requestLeave.findMany({ where: { leaveType: 2, isApproved: 1, isApprovedByHR: 0 } }),
    countHr: () => prisma.requestLeave.count({ where: { leaveType: 2, isApproved: 1, isApprovedByHR: 0 } }),
  },
  {
    key: 'sick2',
    label: 'Sick Leave 2',
    table: 'requestLeave',
    leaveType: 3,
    stages: ['SPV', 'HR'],
    detail: (row) => ({
      title: row.leaveTypeDescription || 'Sick Leave 2',
      period: row.startDuration && row.endDuration
        ? moment(row.startDuration).format('DD-MM-YYYY') + ' s/d ' + moment(row.endDuration).format('DD-MM-YYYY')
        : '-',
      amount: (row.days ?? '-') + ' hari',
    }),
    pendingSpv: (supervisorId) => prisma.requestLeave.findMany({ where: { leaveType: 3, isApproved: 0, fullName: { supervisor: supervisorId } } }),
    countSpv: (supervisorId) => prisma.requestLeave.count({ where: { leaveType: 3, isApproved: 0, fullName: { supervisor: supervisorId } } }),
    pendingHr: () => prisma.requestLeave.findMany({ where: { leaveType: 3, isApproved: 1, isApprovedByHR: 0 } }),
    countHr: () => prisma.requestLeave.count({ where: { leaveType: 3, isApproved: 1, isApprovedByHR: 0 } }),
  },
  {
    key: 'other',
    label: 'Other Leave',
    table: 'requestOtherLeave',
    stages: ['SPV', 'HR'],
    detail: (row) => ({
      title: row.otherleaveTypeDescription || 'Other Leave',
      period: row.startDuration && row.endDuration
        ? moment(row.startDuration).format('DD-MM-YYYY') + ' s/d ' + moment(row.endDuration).format('DD-MM-YYYY')
        : '-',
      amount: (row.days ?? '-') + ' hari',
    }),
    pendingSpv: (supervisorId) => prisma.requestOtherLeave.findMany({ where: { isApproved: 0, employeDetail: { supervisor: supervisorId } } }),
    countSpv: (supervisorId) => prisma.requestOtherLeave.count({ where: { isApproved: 0, employeDetail: { supervisor: supervisorId } } }),
    pendingHr: () => prisma.requestOtherLeave.findMany({ where: { isApproved: 1, isApprovedByHR: 0 } }),
    countHr: () => prisma.requestOtherLeave.count({ where: { isApproved: 1, isApprovedByHR: 0 } }),
  },
  {
    key: 'unpaid',
    label: 'Unpaid Leave',
    table: 'requestLeave',
    leaveType: 4,
    stages: ['SPV', 'HR'],
    detail: (row) => ({
      title: row.leaveTypeDescription || 'Unpaid Leave',
      period: row.startDuration && row.endDuration
        ? moment(row.startDuration).format('DD-MM-YYYY') + ' s/d ' + moment(row.endDuration).format('DD-MM-YYYY')
        : '-',
      amount: (row.days ?? '-') + ' hari',
    }),
    pendingSpv: (supervisorId) => prisma.requestLeave.findMany({ where: { leaveType: 4, isApproved: 0, fullName: { supervisor: supervisorId } } }),
    countSpv: (supervisorId) => prisma.requestLeave.count({ where: { leaveType: 4, isApproved: 0, fullName: { supervisor: supervisorId } } }),
    pendingHr: () => prisma.requestLeave.findMany({ where: { leaveType: 4, isApproved: 1, isApprovedByHR: 0 } }),
    countHr: () => prisma.requestLeave.count({ where: { leaveType: 4, isApproved: 1, isApprovedByHR: 0 } }),
  },
  {
    key: 'medreimb',
    label: 'Medical Reimbursement',
    table: 'requestMedicalReimbursementHeader',
    stages: ['SPV', 'FA'],
    detail: (row) => ({
      title: row.reimbursementCategory || 'Medical Reimbursement',
      period: row.reimbursementDescription || '-',
      amount: 'Rp ' + Number(row.totalReimbursement).toLocaleString('id-ID'),
    }),
    pendingSpv: (supervisorId) => prisma.requestMedicalReimbursementHeader.findMany({ where: { isApproved: 0, employeeInfo: { supervisor: supervisorId } } }),
    countSpv: (supervisorId) => prisma.requestMedicalReimbursementHeader.count({ where: { isApproved: 0, employeeInfo: { supervisor: supervisorId } } }),
    pendingHr: () => prisma.requestMedicalReimbursementHeader.findMany({ where: { isApproved: 1, isApprovedByHR: 0 } }),
    countHr: () => prisma.requestMedicalReimbursementHeader.count({ where: { isApproved: 1, isApprovedByHR: 0 } }),
    pendingFa: () => prisma.requestMedicalReimbursementHeader.findMany({ where: { isApproved: 1, isApprovedByFinance: 0 } }),
    countFa: () => prisma.requestMedicalReimbursementHeader.count({ where: { isApproved: 1, isApprovedByFinance: 0 } }),
  },
];

const POST_TARGETS = {
  annual: { SPV: '/leave-management/approve-annual-leave-by-supervisor', HR: '/leave-management/approve-annual-leave-by-hr' },
  sick: { SPV: '/leave-management/approve-sick-leave-by-supervisor', HR: '/leave-management/approve-sick-leave-by-hr' },
  sick2: { SPV: '/leave-management/approve-sick-leave2-by-supervisor', HR: '/leave-management/approve-sick-leave2-by-hr' },
  other: { SPV: '/leave-management/approve-other-leave-by-supervisor', HR: '/leave-management/approve-other-leave-by-hr' },
  unpaid: { SPV: '/leave-management/approve-unpaid-leave-by-supervisor', HR: '/leave-management/approve-unpaid-leave-by-hr' },
  medreimb: {
    SPV: '/medical-reimbursement-approved-by-supervisor',
    HR: '/medical-reimbursement-approved-by-hr',
    FA: '/medical-reimbursement-approved-by-fa',
  },
};

/** Tab modul approval lama (uri) per jenis × jenjang — fallback union permission. */
const LEGACY_MENU_URIS = {
  annual: { SPV: '/approve-annual-leave-by-supervisor', HR: '/approve-annual-leave-by-hr' },
  sick: { SPV: '/approve-sick-leave-by-supervisor', HR: '/approve-sick-leave-by-hr' },
  sick2: { SPV: '/approve-sick-leave2-by-supervisor', HR: '/approve-sick-leave2-by-hr' },
  other: { SPV: '/approve-other-leave-by-supervisor', HR: '/approve-other-leave-by-hr' },
  unpaid: { SPV: '/approve-unpaid-leave-by-supervisor', HR: '/approve-unpaid-leave-by-hr' },
  medreimb: {
    SPV: '/medical-reimbursement-approved-by-supervisor/listing',
    HR: '/medical-reimbursement-approved-by-hr/listing',
    FA: '/medical-reimbursement-approved-by-fa/listing',
  },
};

/** URI modul menu My Approvals. */
const INBOX_URI = '/approval-inbox';


/** Ambil pending rows (dengan nama karyawan) untuk satu jenis & jenjang. */
async function getPendingRows(kind, stage, limit, supervisorId) {
  const k = KINDS.find((x) => x.key === kind);
  // stage 'SPV' -> 'pendingSpv' (konsisten dengan penamaan properti KINDS)
  const fnName = 'pending' + stage.charAt(0) + stage.slice(1).toLowerCase();
  if (!k || typeof k[fnName] !== 'function') return [];
  // Queue SPV di-scope ke bawahan langsung (menyamakan listing legacy: supervisor = req.user.id)
  const rows = stage === 'SPV' ? await k[fnName](supervisorId) : await k[fnName]();
  const ids = rows.map((r) => r.id).slice(0, limit || 50);
  if (ids.length === 0) return [];

  if (k.table === 'requestLeave') {
    return prisma.requestLeave.findMany({
      where: { id: { in: ids } },
      include: { fullName: { select: { id: true, fullName: true, employeeId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  if (k.table === 'requestOtherLeave') {
    return prisma.requestOtherLeave.findMany({
      where: { id: { in: ids } },
      include: { employeDetail: { select: { id: true, fullName: true, employeeId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  return prisma.requestMedicalReimbursementHeader.findMany({
    where: { id: { in: ids } },
    include: { employeeInfo: { select: { id: true, fullName: true, employeeId: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

/** Nama karyawan seragam dari baris hasil query. */
function employeeName(row, kind) {
  if (kind === 'other') return row.employeDetail ? row.employeDetail.fullName : '-';
  if (kind === 'medreimb') return row.employeeInfo ? row.employeeInfo.fullName : '-';
  return row.fullName ? row.fullName.fullName : '-';
}

/** Jenis approval yang relevan untuk sekumpulan jenjang (murni, testable). */
function tabsFromStages(stages) {
  return kindsForStages(KINDS, stages);
}

/**
 * Sumber akses & tab inbox untuk satu role.
 *  - hasInboxRead: readRight pada modul /approval-inbox (menu My Approvals).
 *    Tanpa ini role tidak boleh melihat inbox apa pun, apa pun jenjangnya.
 *  - roleStages: jenjang dari NAMA role (Supervisor/HR/FA/Admin) — sumber
 *    utama; env baru otomatis benar tanpa seed permission tambahan.
 *  - legacyStages: jenjang dari permission menu legacy (union) — fallback
 *    kompatibilitas untuk role lama yang namanya tidak standar.
 *  - tabs: jenis approval (key) yang punya irisan jenjang dengan
 *    union(roleStages, legacyStages).
 */
async function inboxAccessForRole(roleId) {
  const out = { hasInboxRead: false, roleStages: [], legacyStages: [], tabs: [] };
  if (!roleId) return out;

  const inboxModul = await prisma.module.findFirst({ where: { uri: INBOX_URI }, select: { id: true } });
  if (!inboxModul) return out;
  const inboxPerm = await prisma.modulePermission.findFirst({
    where: { roleId, modulId: inboxModul.id, readRight: 1 },
    select: { id: true },
  });
  if (!inboxPerm) return out;
  out.hasInboxRead = true;

  // Jenjang dari nama role
  const roleRow = await prisma.roles.findUnique({ where: { id: roleId }, select: { roleName: true } });
  out.roleStages = stagesForRoleName(roleRow && roleRow.roleName);

  // Fallback: union stage dari permission menu legacy
  const legacyUris = [];
  for (const [kind, stages] of Object.entries(LEGACY_MENU_URIS)) {
    for (const [stage, uri] of Object.entries(stages)) legacyUris.push({ kind, stage, uri });
  }
  const legacyModuls = await prisma.module.findMany({
    where: { uri: { in: legacyUris.map((u) => u.uri) } },
    select: { id: true, uri: true },
  });
  const byUri = new Map(legacyModuls.map((m) => [m.uri, m.id]));
  const legacyPerms = await prisma.modulePermission.findMany({
    where: { roleId, modulId: { in: legacyModuls.map((m) => m.id) }, readRight: 1 },
    select: { modulId: true },
  });
  const legacyIds = new Set(legacyPerms.map((p) => p.modulId));
  for (const { stage, uri } of legacyUris) {
    if (legacyIds.has(byUri.get(uri))) out.legacyStages.push(stage);
  }

  const stages = [...new Set([...out.roleStages, ...out.legacyStages])];
  out.tabs = tabsFromStages(stages);
  return out;
}

/** Kompatibilitas: kembalikan { kindKey: Set(stage) } untuk satu role.
 *  Sumber tab kini = inboxAccessForRole (bukan lagi permission menu legacy). */
async function tabsForRole(roleId) {
  const access = await inboxAccessForRole(roleId);
  const result = {};
  for (const kind of KINDS) {
    if (!access.tabs.includes(kind.key)) continue;
    const stages = kind.stages.filter((s) => access.roleStages.includes(s) || access.legacyStages.includes(s));
    if (stages.length > 0) result[kind.key] = new Set(stages);
  }
  return result;
}

module.exports = {
  INBOX_URI,
  KINDS,
  POST_TARGETS,
  LEGACY_MENU_URIS,
  getPendingRows,
  employeeName,
  stagesForRoleName,
  tabsFromStages,
  inboxAccessForRole,
  tabsForRole,
};
