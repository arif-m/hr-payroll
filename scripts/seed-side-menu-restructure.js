/**
 * seed-side-menu-restructure.js — standalone/idempotent untuk DB yang sudah
 * berjalan. Sumber data & logika ada di side-menu-inbox-data.js.
 * Jalankan: node scripts/seed-side-menu-restructure.js
 */
const { PrismaClient } = require('@prisma/client');
const { seedSideMenuRestructure } = require('./side-menu-inbox-data');

const prisma = new PrismaClient();

seedSideMenuRestructure(prisma)
  .catch((e) => {
    console.error('Seed gagal:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
