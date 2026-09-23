/**
 * smoke-test-employment-history.js — reversible end-to-end:
 *  1. pastikan semua karyawan aktif punya baris riwayat (backfill idempotent)
 *  2. ubah nominal komponen gaji karyawan pertama + recordChange
 *  3. getSalaryAt: sebelum perubahan → nominal lama; sesudah → nominal baru;
 *     sebelum joinDate → null
 *  4. cleanup di FINALLY — selalu jalan, bahkan saat assertion gagal.
 * Jalankan: node scripts/smoke-test-employment-history.js  (butuh MySQL jalan)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const assert = require('node:assert');
const employmentHistory = require('../libs/payroll/employment-history');

const prisma = new PrismaClient();
const actor = 'smoke-test';

async function main() {
  // Self-heal: buang sisa percobaan sebelumnya (baris INITIAL backfill dibiarkan —
  // dibuat ulang otomatis bila tidak ada).
  await prisma.employmentHistory.deleteMany({ where: { createdBy: actor, NOT: { changeType: 'INITIAL' } } });

  const user = await prisma.users.findFirst({ where: { status: 'Active' }, orderBy: { id: 'asc' } });
  assert.ok(user, 'butuh minimal 1 karyawan aktif');
  console.log(`Karyawan uji: ${user.fullName} (id ${user.id}, join ${user.joinDate.toISOString().slice(0, 10)})`);

  // --- 1. Backfill idempotent ----------------------------------------------
  await employmentHistory.backfillAll(prisma, actor);
  const activeCount = await prisma.users.count({ where: { status: 'Active' } });
  const withHistory = await prisma.employmentHistory.findMany({ select: { usersId: true }, distinct: ['usersId'] });
  assert.ok(withHistory.length >= activeCount, 'semua karyawan aktif punya riwayat');
  const written2 = await employmentHistory.backfillAll(prisma, actor);
  assert.strictEqual(written2, 0, 'backfill kedua = 0 (idempotent)');
  console.log(`Backfill: ${withHistory.length}/${activeCount} karyawan; idempotent ✓`);

  // --- 2. Ubah komponen gaji + catat CHANGE_COMPONENT ----------------------
  const comp = await prisma.usersSalary.findFirst({
    where: { usersId: user.id, amount: { gt: 0 } },
    orderBy: { sequence: 'asc' },
  });
  assert.ok(comp, 'karyawan uji punya komponen gaji');
  const oldAmount = Number(comp.amount);
  const newAmount = oldAmount + 1_000_000;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

  await prisma.usersSalary.update({ where: { id: comp.id }, data: { amount: newAmount } });
  const snap = await employmentHistory.snapshotCurrentState(prisma, user.id);
  await employmentHistory.recordChange(prisma, {
    usersId: user.id, effectiveDate: todayStr,
    changeType: employmentHistory.CHANGE_TYPES.CHANGE_COMPONENT,
    reason: `Smoke test: ${comp.componentName} ${oldAmount} → ${newAmount}`,
    ...snap, actor,
  });
  console.log(`Ubah ${comp.componentName}: ${oldAmount} → ${newAmount} (riwayat terekam)`);

  // --- 3. getSalaryAt sebelum & sesudah ------------------------------------
  // Sebelum perubahan (tapi setelah joinDate) → kondisi INITIAL = nominal lama.
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  const snapBefore = await employmentHistory.getSalaryAt(prisma, user.id, yesterdayStr);
  assert.strictEqual(snapBefore.totalFixedIncome, oldAmount, `per ${yesterdayStr} = nominal lama (dapat ${snapBefore && snapBefore.totalFixedIncome})`);
  const snapAfter = await employmentHistory.getSalaryAt(prisma, user.id, todayStr);
  assert.strictEqual(snapAfter.totalFixedIncome, newAmount, `per ${todayStr} = nominal baru`);
  const snapTmrw = await employmentHistory.getSalaryAt(prisma, user.id, tomorrowStr);
  assert.strictEqual(snapTmrw.totalFixedIncome, newAmount, 'ambang di masa depan juga nominal baru');
  // Sebelum joinDate → null (belum ada gaji, semantik yang benar).
  const snapNull = await employmentHistory.getSalaryAt(prisma, user.id, '2000-01-01');
  assert.strictEqual(snapNull, null, 'sebelum joinDate harus null');
  console.log(`getSalaryAt: lama ✓ baru ✓ masa-depan ✓ null-sebelum-join ✓ (jabatan per ${todayStr}: ${snapAfter.jobTitleName})`);

  console.log('SMOKE TEST EMPLOYMENT HISTORY PASS');
}

main()
  .catch((e) => { console.error('GAGAL:', e.message); process.exitCode = 1; })
  .finally(async () => {
    // --- 4. Pulihkan DB (SELALU) ---------------------------------------------
    try {
      // Nominal komponen: kembalikan komponen yang diubah smoke ke nominal lama
      // (tercatat pada baris CHANGE_COMPONENT milik aktor smoke-test).
      const smokeRow = await prisma.employmentHistory.findFirst({
        where: { createdBy: actor, changeType: 'CHANGE_COMPONENT' },
        orderBy: { id: 'desc' },
      });
      if (smokeRow && smokeRow.reason) {
        const m = smokeRow.reason.match(/(\d+) → (\d+)$/);
        if (m) {
          await prisma.usersSalary.updateMany({
            where: { usersId: smokeRow.usersId, amount: Number(m[2]) },
            data: { amount: Number(m[1]) },
          });
        }
      }
      await prisma.employmentHistory.deleteMany({ where: { createdBy: actor, NOT: { changeType: 'INITIAL' } } });
      console.log('DB dipulihkan (nominal + baris riwayat percobaan dihapus; baris INITIAL dibiarkan)');
    } catch (e) {
      console.error('CLEANUP GAGAL:', e.message);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
