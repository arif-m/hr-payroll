/**
 * seed-ter.js — isi tabel terRate dari tabel TER di libs/payroll/tax21.js
 * (satu sumber kebenaran untuk kode & DB). Idempotent: hapus lalu isi ulang.
 * Jalankan setelah migration.sql:
 *   node scripts/seed-ter.js
 */
const prisma = require('../libs/prisma');
const { TER_TABLES } = require('../libs/payroll/tax21');

async function main() {
  const rows = [];
  for (const [category, table] of Object.entries(TER_TABLES)) {
    table.forEach(([upperBound, ratePercent], idx) => {
      rows.push({
        category,
        upperBound,
        ratePercent,
        sequence: idx + 1,
      });
    });
  }

  await prisma.$transaction([
    prisma.terRate.deleteMany({}),
    prisma.terRate.createMany({ data: rows }),
  ]);

  const counts = await prisma.terRate.groupBy({
    by: ['category'],
    _count: { id: true },
  });
  console.log('Seed terRate selesai:', counts.map((c) => `${c.category}=${c._count.id}`).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
