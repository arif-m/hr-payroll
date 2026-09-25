/**
 * attendance-menu-data.js — SUMBER DATA TUNGGAL menu samping fitur Absensi
 * (Master Shift, Employee Shift, Business Unit, Setup Attendance).
 *
 * Dipakai dua tempat:
 *   - prisma/seed.ts (via seedAttendanceMenu(prisma)) — ikut `prisma db seed`
 *   - scripts/seed-attendance-menu.js — standalone/idempotent untuk DB existing
 *
 * Catatan penting:
 * - Role dicari BY NAME (bukan id hard-coded) karena seed resmi hanya membuat
 *   Employee/Admin/Super Admin, sedangkan DB development juga punya HR/Supervisor.
 * - Tabel modulePermission TIDAK punya unique (modulId, roleId), jadi idempotensi
 *   wajib lewat findFirst + pembersihan baris ganda — bukan findUnique/skipDuplicates.
 */

const MENU_ITEMS = [
  { feature: 'Master Shift', uri: '/shift', sequence: 656 },
  { feature: 'Employee Shift', uri: '/employee-shift', sequence: 657 },
  { feature: 'Business Unit', uri: '/business-unit', sequence: 659 },
  { feature: 'Setup Attendance', uri: '/attendance-setup', sequence: 661 },
];

const PARENT_FEATURE = 'Payroll Management';
const DESCRIPTION = 'Absensi Mode Pabrik (Fase 1/2)';

/** Pola permission per roleName: Admin & Super Admin CRUD, HR read-only. */
const PERMISSION_RULES = [
  { roleName: 'Admin', createRight: 1, readRight: 1, updateRight: 1, deleteRight: 1 },
  { roleName: 'Super Admin', createRight: 1, readRight: 1, updateRight: 1, deleteRight: 1 },
  { roleName: 'HR', createRight: 0, readRight: 1, updateRight: 0, deleteRight: 0 },
];

/**
 * Tanam menu absensi + permission secara idempotent.
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function seedAttendanceMenu(prisma) {
  const parent = await prisma.module.findFirst({
    where: { feature: PARENT_FEATURE },
    select: { id: true },
  });
  if (!parent) throw new Error(`Parent "${PARENT_FEATURE}" tidak ditemukan di tabel module`);

  // Role yang tersedia di lingkungan ini (by name).
  const roleRows = await prisma.roles.findMany({ select: { id: true, roleName: true } });
  const roleByName = {};
  for (const r of roleRows) roleByName[r.roleName] = r.id;

  for (const item of MENU_ITEMS) {
    let modul = await prisma.module.findFirst({ where: { uri: item.uri } });
    if (!modul) {
      modul = await prisma.module.create({
        data: {
          createdBy: 'SEED-ATTENDANCE',
          updatedBy: 'SEED-ATTENDANCE',
          feature: item.feature,
          description: DESCRIPTION,
          uri: item.uri,
          parentId: parent.id,
          treeStatus: 'D',
          icon: null,
          isVisible: 1,
          sequence: item.sequence,
        },
      });
      console.log('module dibuat   :', item.feature, '(id', modul.id + ')');
    } else {
      console.log('module sudah ada:', item.feature, '(id', modul.id + ')');
    }

    for (const rule of PERMISSION_RULES) {
      const roleId = roleByName[rule.roleName];
      if (!roleId) {
        console.log('  role tidak ada, lewati:', rule.roleName);
        continue;
      }
      // Tabel tanpa unique (modulId, roleId) — cek manual sebelum create.
      const existing = await prisma.modulePermission.findFirst({
        where: { modulId: modul.id, roleId },
        select: { id: true },
      });
      if (existing) {
        console.log('  permission sudah ada:', rule.roleName);
        continue;
      }
      await prisma.modulePermission.create({
        data: {
          createdBy: 'SEED-ATTENDANCE',
          updatedBy: 'SEED-ATTENDANCE',
          modulId: modul.id,
          roleId,
          createRight: rule.createRight,
          readRight: rule.readRight,
          updateRight: rule.updateRight,
          deleteRight: rule.deleteRight,
          inactiveRight: 0,
        },
      });
      console.log('  permission dibuat   :', rule.roleName);
    }

    // Bersihkan baris ganda (akar masalah menu dobel pada seed lama).
    const perms = await prisma.modulePermission.findMany({
      where: { modulId: modul.id },
      orderBy: { id: 'asc' },
      select: { id: true, roleId: true },
    });
    const seen = new Set();
    const dupIds = [];
    for (const pr of perms) {
      if (seen.has(pr.roleId)) dupIds.push(pr.id);
      else seen.add(pr.roleId);
    }
    if (dupIds.length > 0) {
      await prisma.modulePermission.deleteMany({ where: { id: { in: dupIds } } });
      console.log('  dibersihkan', dupIds.length, 'permission ganda');
    }
  }
  console.log('Seed menu absensi selesai.');
}

module.exports = {
  MENU_ITEMS,
  PARENT_FEATURE,
  PERMISSION_RULES,
  seedAttendanceMenu,
};
