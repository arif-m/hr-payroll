/**
 * annual-leave-reset-menu.js — menu "Annual Leave Reset" (/annual-leave-reset)
 * di bawah parent "Employee Leave Setting". Idempotent: findFirst + pembersih
 * duplikat (modulePermission tidak punya unique (modulId, roleId)).
 * Permission = union role yang punya readRight pada parent.
 * Dipakai prisma/seed.ts + standalone `node scripts/seed-annual-leave-reset-menu.js`.
 */

async function seedAnnualLeaveResetMenu(prisma) {
  const parent = await prisma.module.findFirst({ where: { feature: 'Employee Leave Setting' }, select: { id: true } });
  if (!parent) throw new Error('Parent "Employee Leave Setting" tidak ditemukan');

  // Pembersih duplikat (jaga-jaga historis)
  const all = await prisma.module.findMany({ where: { uri: '/annual-leave-reset' }, select: { id: true }, orderBy: { id: 'asc' } });
  if (all.length > 1) {
    const keep = all[0].id;
    const dupIds = all.slice(1).map((m) => m.id);
    await prisma.modulePermission.deleteMany({ where: { modulId: { in: dupIds } } });
    await prisma.module.deleteMany({ where: { id: { in: dupIds } } });
    console.log('duplikat module dihapus:', dupIds.join(','));
    var modulId = keep;
  }

  let modul = modulId
    ? await prisma.module.findUnique({ where: { id: modulId } })
    : await prisma.module.findFirst({ where: { uri: '/annual-leave-reset' } });
  if (!modul) {
    modul = await prisma.module.create({
      data: {
        createdBy: 'SEED-MENU', updatedBy: 'SEED-MENU',
        feature: 'Annual Leave Reset', description: 'Penghangusan saldo annual leave manual (Preview -> Execute)',
        uri: '/annual-leave-reset', parentId: parent.id, treeStatus: 'D', isVisible: 1, sequence: 440,
      },
    });
    console.log('module dibuat   : Annual Leave Reset (id', modul.id + ')');
  } else {
    console.log('module sudah ada: Annual Leave Reset (id', modul.id + ')');
  }

  // Permission = union pemegang parent (Employee Leave Setting)
  const parentPerms = await prisma.modulePermission.findMany({
    where: { modulId: parent.id, readRight: 1 },
    select: { roleId: true },
  });
  const roleIds = [...new Set(parentPerms.map((p) => p.roleId))];
  for (const roleId of roleIds) {
    const existing = await prisma.modulePermission.findFirst({ where: { modulId: modul.id, roleId }, select: { id: true } });
    if (existing) continue;
    await prisma.modulePermission.create({
      data: { createdBy: 'SEED-MENU', updatedBy: 'SEED-MENU', modulId: modul.id, roleId, createRight: 0, readRight: 1, updateRight: 0, deleteRight: 0, inactiveRight: 0 },
    });
    console.log('  permission dibuat: roleId', roleId);
  }
  console.log('Seed menu Annual Leave Reset selesai.');
}

module.exports = { seedAnnualLeaveResetMenu };
