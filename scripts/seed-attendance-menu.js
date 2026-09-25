/**
 * Seed menu samping untuk fitur Absensi Mode Pabrik (Fase 1):
 *   - Master Shift      (/shift)            → anak "Payroll Management"
 *   - Employee Shift    (/employee-shift)   → anak "Payroll Management"
 *   - Business Unit     (/business-unit)    → anak "Payroll Management"
 * Permission mengikuti pola "Time Attendance (Admin)":
 *   Admin (2): create+read, Super Admin (3): create+read, HR (4): read-only.
 * Idempotent — aman dijalankan berulang:
 *   node scripts/seed-attendance-menu.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ITEMS = [
  { feature: 'Master Shift', uri: '/shift', sequence: 656 },
  { feature: 'Employee Shift', uri: '/employee-shift', sequence: 657 },
  { feature: 'Business Unit', uri: '/business-unit', sequence: 659 },
  { feature: 'Setup Attendance', uri: '/attendance-setup', sequence: 661 },
];

const PERMISSIONS = [
  { roleId: 2, createRight: 1, readRight: 1, updateRight: 1, deleteRight: 1 }, // Admin
  { roleId: 3, createRight: 1, readRight: 1, updateRight: 1, deleteRight: 1 }, // Super Admin
  { roleId: 4, createRight: 0, readRight: 1, updateRight: 0, deleteRight: 0 }, // HR read-only
];

async function main() {
  // 1. Pastikan parent "Payroll Management" ada (id 22 pada data existing,
  //    dicari by feature agar tahan perbedaan data antar lingkungan).
  const parent = await prisma.module.findFirst({
    where: { feature: 'Payroll Management' },
    select: { id: true, treeStatus: true },
  });
  if (!parent) throw new Error('Parent "Payroll Management" tidak ditemukan di tabel module');

  for (const item of ITEMS) {
    let modul = await prisma.module.findFirst({ where: { uri: item.uri } });
    if (!modul) {
      modul = await prisma.module.create({
        data: {
          createdBy: 'SEED-ATTENDANCE',
          updatedBy: 'SEED-ATTENDANCE',
          feature: item.feature,
          description: 'Absensi Mode Pabrik (Fase 1)',
          uri: item.uri,
          parentId: parent.id,
          treeStatus: 'D',
          icon: null,
          isVisible: 1,
          sequence: item.sequence,
        },
      });
      console.log('module dibuat  :', item.feature, '(id', modul.id + ')');
    } else {
      console.log('module sudah ada:', item.feature, '(id', modul.id + ')');
    }

    for (const perm of PERMISSIONS) {
      const where = { modulId_roleId: { modulId: modul.id, roleId: perm.roleId } };
      const existing = await prisma.modulePermission.findUnique({ where }).catch(() => null);
      if (existing) {
        console.log('  permission sudah ada: roleId', perm.roleId);
        continue;
      }
      await prisma.modulePermission.create({
        data: {
          createdBy: 'SEED-ATTENDANCE',
          updatedBy: 'SEED-ATTENDANCE',
          modulId: modul.id,
          roleId: perm.roleId,
          createRight: perm.createRight,
          readRight: perm.readRight,
          updateRight: perm.updateRight,
          deleteRight: perm.deleteRight,
          inactiveRight: 0,
        },
      });
      console.log('  permission dibuat  : roleId', perm.roleId);
    }
  }
  console.log('Seed menu absensi selesai.');
}

main()
  .catch((e) => {
    console.error('Seed gagal:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
