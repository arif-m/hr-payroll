/**
 * seed-attendance-menu.js — standalone/idempotent untuk DB yang SUDAH berjalan
 * (tidak menunggu re-seed). Sumber data & logika ada di attendance-menu-data.js.
 * Jalankan: node scripts/seed-attendance-menu.js
 */
const { PrismaClient } = require('@prisma/client');
const { seedAttendanceMenu } = require('./attendance-menu-data');

const prisma = new PrismaClient();

seedAttendanceMenu(prisma)
  .catch((e) => {
    console.error('Seed gagal:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
