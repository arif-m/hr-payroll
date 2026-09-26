/**
 * seed-annual-leave-reset.js — standalone/idempotent untuk DB yang sudah berjalan.
 * Jalankan: node scripts/seed-annual-leave-reset.js
 */
const { PrismaClient } = require('@prisma/client');
const { seedAnnualLeaveResetMenu } = require('./annual-leave-reset-menu');

const prisma = new PrismaClient();

seedAnnualLeaveResetMenu(prisma)
  .catch((e) => {
    console.error('Seed gagal:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
