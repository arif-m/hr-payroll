/**
 * config.js — Loader konfigurasi tarif PPh 21 dari DATABASE.
 *
 * Satu sumber kebenaran produksi:
 *   - tabel terRate  (seed dari libs/payroll/tax21.js via scripts/seed-ter.js)
 *       → config.terTables { A|B|C: [[batasAtasBruto, ratePersen], ...] }
 *   - tabel pkp      (diedit via UI pkp yang sudah ada)
 *       → config.pasal17Brackets [[batasAtasPkpTahunan, ratePersen], ...]
 *   - tabel ptkp     (diedit via UI ptkp yang sudah ada)
 *       → config.ptkpAmounts { 'TK/0': 54000000, ... }
 *   - setupSystem    (kolom biayaJabatanMaxMonthly & npwpSurchargePct)
 *       → config.biayaJabatan.{ratePercent,maxMonthly}, npwpSurchargePercent
 *
 * Bila tabel kosong/kolom belum ada (migrasi lama), parameter tsb dibiarkan
 * undefined → normalizeConfig() di tax21.js memakai default fallback.
 * Rate disimpan di DB dalam SATUAN PERSEN (mis. 5 = 5%) — konsisten dengan
 * seed salaryComponent & template BPJS.
 */
const prisma = require('../prisma');

/** Tabel TER: baris terakhir DB memakai batas sangat besar; rapikan ke 1e12. */
const TER_UPPER_CAP = 1e12;

async function loadTerTables() {
  const rows = await prisma.terRate.findMany({ orderBy: [{ category: 'asc' }, { sequence: 'asc' }] });
  if (!rows.length) return undefined;

  const terTables = {};
  for (const r of rows) {
    const cat = String(r.category).toUpperCase().trim();
    if (!['A', 'B', 'C'].includes(cat)) continue;
    const upper = Number(r.upperBound);
    if (!Number.isFinite(upper)) continue;
    if (!terTables[cat]) terTables[cat] = [];
    terTables[cat].push([upper > TER_UPPER_CAP ? TER_UPPER_CAP : upper, Number(r.ratePercent)]);
  }
  return Object.keys(terTables).length ? terTables : undefined;
}

async function loadPasal17Brackets() {
  const rows = await prisma.pkp.findMany({
    orderBy: { startSalary: 'asc' },
    select: { startSalary: true, endSalary: true, ratesPercentage: true },
  });
  if (!rows.length) return undefined;

  const brackets = [];
  let prevUpper = 0;
  for (const r of rows) {
    const start = Number(r.startSalary);
    const end = Number(r.endSalary);
    const rate = Number(r.ratesPercentage);
    if (!Number.isFinite(end) || !Number.isFinite(rate)) continue;
    // Lapisan harus berurutan: width = end − start (bila mulus), atau end − prevUpper.
    const width = start === prevUpper ? end - start : end - Math.min(prevUpper, end);
    if (width <= 0) continue;
    brackets.push([end, rate]);
    prevUpper = end;
  }
  return brackets.length ? brackets : undefined;
}

async function loadPtkpAmounts() {
  const rows = await prisma.ptkp.findMany({
    select: { code: true, amount: true },
  });
  if (!rows.length) return undefined;

  const ptkpAmounts = {};
  for (const r of rows) {
    if (!r.code || r.amount == null) continue;
    ptkpAmounts[String(r.code).toUpperCase().trim()] = Number(r.amount);
  }
  return Object.keys(ptkpAmounts).length ? ptkpAmounts : undefined;
}

async function loadSetupSystemParams() {
  const setup = await prisma.setupSystem.findFirst({
    select: { taxPercentage: true, biayaJabatanMaxMonthly: true, npwpSurchargePct: true },
  });
  if (!setup) return undefined;

  const params = {};
  // taxPercentage di setupSystem (default 5) dipakai sebagai rate biaya jabatan.
  if (setup.taxPercentage != null) params.ratePercent = Number(setup.taxPercentage);
  if (setup.biayaJabatanMaxMonthly != null) params.maxMonthly = Number(setup.biayaJabatanMaxMonthly);
  return Object.keys(params).length ? params : undefined;
}

/**
 * Muat seluruh konfigurasi tarif dari DB. Aman dipanggil sekali per batch
 * generate; gagal DB (mis. tabel belum ada) → undefined penuh (fallback).
 * @returns {Promise<Object>} config untuk fungsi-fungsi tax21
 */
async function loadTaxConfig() {
  const [terTables, pasal17Brackets, ptkpAmounts, biayaJabatan] = await Promise.all([
    loadTerTables().catch(() => undefined),
    loadPasal17Brackets().catch(() => undefined),
    loadPtkpAmounts().catch(() => undefined),
    loadSetupSystemParams().catch(() => undefined),
  ]);

  const setupRow = await prisma.setupSystem.findFirst({
    select: { npwpSurchargePct: true },
  }).catch(() => null);

  return {
    ...(terTables ? { terTables } : {}),
    ...(pasal17Brackets ? { pasal17Brackets } : {}),
    ...(ptkpAmounts ? { ptkpAmounts } : {}),
    ...(biayaJabatan ? { biayaJabatan } : {}),
    ...(setupRow && setupRow.npwpSurchargePct != null
      ? { npwpSurchargePercent: Number(setupRow.npwpSurchargePct) } : {}),
  };
}

module.exports = { loadTaxConfig };
