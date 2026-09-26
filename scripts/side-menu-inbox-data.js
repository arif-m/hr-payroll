/**
 * side-menu-inbox-data.js — Restrukturisasi side menu:
 *  1. Modul "My Approvals" (/approval-inbox) menggantikan 13 menu approval
 *     legacy yang disembunyikan (isVisible=0, TIDAK dihapus).
 *     Permission inbox = union dari (a) pemegang menu legacy mana pun dan
 *     (b) role yang namanya memetakan ke jenjang approval
 *     (Supervisor/HR/FA/Admin — lihat libs/approval/stages.js).
 *     Role tanpa jenjang mana pun dihapus permission inbox-nya BILA
 *     permission itu dibuat seed (createdBy='SEED-MENU') — grant manual
 *     admin tidak disentuh.
 *  2. Payroll Management 19 anak dikelompokkan menjadi 4 sub-menu.
 * Idempotent; permission grup = union role yang punya akses ke salah satu anak.
 * Dipakai: prisma/seed.ts (via helper) + standalone `node scripts/seed-side-menu-restructure.js`.
 */

const { stagesForRoleName } = require('../libs/approval/stages');

const INBOX = { feature: 'My Approvals', uri: '/approval-inbox', sequence: 559, parent: 'Employee Main Features' };

const LEGACY_URIS = [
  '/approve-annual-leave-by-supervisor', '/approve-annual-leave-by-hr',
  '/approve-sick-leave-by-supervisor', '/approve-sick-leave-by-hr',
  '/approve-sick-leave2-by-supervisor', '/approve-sick-leave2-by-hr',
  '/approve-other-leave-by-supervisor', '/approve-other-leave-by-hr',
  '/approve-unpaid-leave-by-supervisor', '/approve-unpaid-leave-by-hr',
  '/medical-reimbursement-approved-by-supervisor/listing',
  '/medical-reimbursement-approved-by-hr/listing',
  '/medical-reimbursement-approved-by-fa/listing',
];

const PAYROLL_GROUPS = [
  { feature: 'My Payroll', sequence: 605, children: ['/payslip'] },
  { feature: 'Payroll Transactions', sequence: 611, children: ['/payroll-run', '/generate-salary', '/list-cutoff-period', '/employment-history', '/setup-employee-salary'] },
  { feature: 'Payroll Attendance', sequence: 612, children: ['/time-attendance-admin', '/time-attendance-employee', '/shift', '/employee-shift', '/business-unit', '/attendance-setup'] },
  { feature: 'Payroll Master & Tax', sequence: 613, children: ['/salary-template', '/salary-component', '/ptkp', '/pkp', '/ter-rate', '/calendar', '/payslip-admin'] },
];
const PAYROLL_PARENT = 'Payroll Management';

async function seedSideMenuRestructure(prisma) {
  // --- 1. My Approvals ------------------------------------------------------
  const empMain = await prisma.module.findFirst({ where: { feature: INBOX.parent }, select: { id: true } });
  if (!empMain) throw new Error('Parent "' + INBOX.parent + '" tidak ditemukan');
  let inbox = await prisma.module.findFirst({ where: { uri: INBOX.uri } });
  if (!inbox) {
    inbox = await prisma.module.create({
      data: {
        createdBy: 'SEED-MENU', updatedBy: 'SEED-MENU',
        feature: INBOX.feature, description: 'Inbox approval semua jenis (SPV/HR/FA)',
        uri: INBOX.uri, parentId: empMain.id, treeStatus: 'D', isVisible: 1, sequence: INBOX.sequence,
      },
    });
    console.log('module dibuat   : My Approvals (id', inbox.id + ')');
  } else {
    console.log('module sudah ada: My Approvals (id', inbox.id + ')');
  }

  // Permission inbox = union:
  //   (a) role yang punya read pada menu approval legacy mana pun, dan
  //   (b) role yang NAMANYA memetakan ke jenjang approval (Supervisor/HR/FA/Admin).
  //     Sumber (b) membuat env baru otomatis benar tanpa seed permission tambahan.
  // Role tanpa jenjang mana pun: permission inbox yang dibuat SEED dihapus
  // (cleanup stale); grant manual admin (createdBy lain) tidak disentuh.
  const legacyModuls = await prisma.module.findMany({ where: { uri: { in: LEGACY_URIS } }, select: { id: true } });
  const legacyPerms = await prisma.modulePermission.findMany({
    where: { modulId: { in: legacyModuls.map((m) => m.id) }, readRight: 1 },
    select: { roleId: true },
  });
  const legacyRoleIds = new Set(legacyPerms.map((p) => p.roleId));
  const roles = await prisma.roles.findMany({ select: { id: true, roleName: true }, orderBy: { id: 'asc' } });
  for (const role of roles) {
    const roleStages = stagesForRoleName(role.roleName);
    const isLegacyHolder = legacyRoleIds.has(role.id);
    const existing = await prisma.modulePermission.findFirst({ where: { modulId: inbox.id, roleId: role.id }, select: { id: true, createdBy: true } });
    if (roleStages.length > 0 || isLegacyHolder) {
      if (existing) continue;
      await prisma.modulePermission.create({
        data: { createdBy: 'SEED-MENU', updatedBy: 'SEED-MENU', modulId: inbox.id, roleId: role.id, createRight: 0, readRight: 1, updateRight: 0, deleteRight: 0, inactiveRight: 0 },
      });
      console.log('  inbox permission dibuat: roleId', role.id, '(' + role.roleName + ')');
    } else if (existing && existing.createdBy === 'SEED-MENU') {
      await prisma.modulePermission.delete({ where: { id: existing.id } });
      console.log('  inbox permission stale dihapus: roleId', role.id, '(' + role.roleName + ')');
    }
  }

  // Sembunyikan menu legacy (isVisible=0, tidak dihapus).
  const hidden = await prisma.module.updateMany({ where: { uri: { in: LEGACY_URIS } }, data: { isVisible: 0 } });
  console.log('menu legacy disembunyikan:', hidden.count);

  // --- 2. Sub-grup Payroll Management --------------------------------------
  const payroll = await prisma.module.findFirst({ where: { feature: PAYROLL_PARENT }, select: { id: true } });
  if (!payroll) throw new Error('Parent "' + PAYROLL_PARENT + '" tidak ditemukan');

  for (const group of PAYROLL_GROUPS) {
    let g = await prisma.module.findFirst({ where: { feature: group.feature, parentId: payroll.id } });
    if (!g) {
      g = await prisma.module.create({
        data: {
          createdBy: 'SEED-MENU', updatedBy: 'SEED-MENU',
          feature: group.feature, description: 'Grup menu payroll',
          uri: '#', parentId: payroll.id, treeStatus: 'H', isVisible: 1, sequence: group.sequence,
        },
      });
      console.log('grup dibuat   :', group.feature, '(id', g.id + ')');
    } else {
      console.log('grup sudah ada:', group.feature, '(id', g.id + ')');
    }
    // Pindahkan anak ke grup (by uri, hanya yang masih anak langsung Payroll Mgmt)
    const moved = await prisma.module.updateMany({
      where: { uri: { in: group.children }, parentId: payroll.id },
      data: { parentId: g.id },
    });
    console.log('  anak dipindah:', moved.count);

    // Permission grup = union role yang punya read pada anak-anaknya
    const kids = await prisma.module.findMany({ where: { parentId: g.id }, select: { id: true } });
    const kidPerms = await prisma.modulePermission.findMany({
      where: { modulId: { in: kids.map((k) => k.id) }, readRight: 1 },
      select: { roleId: true },
    });
    const groupRoles = [...new Set(kidPerms.map((p) => p.roleId))];
    for (const roleId of groupRoles) {
      const existing = await prisma.modulePermission.findFirst({ where: { modulId: g.id, roleId }, select: { id: true } });
      if (existing) continue;
      await prisma.modulePermission.create({
        data: { createdBy: 'SEED-MENU', updatedBy: 'SEED-MENU', modulId: g.id, roleId, createRight: 0, readRight: 1, updateRight: 0, deleteRight: 0, inactiveRight: 0 },
      });
      console.log('  grup permission dibuat: roleId', roleId);
    }
  }
  console.log('Seed restrukturisasi menu selesai.');
}

module.exports = { seedSideMenuRestructure, INBOX, LEGACY_URIS, PAYROLL_GROUPS };
