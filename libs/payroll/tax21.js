/**
 * tax21.js — Mesin perhitungan PPh Pasal 21 (pure functions, tanpa DB).
 *
 * Regime "TER" (default, sesuai PP 58/2023 & PMK 168/2023, berlaku 1 Jan 2024):
 *  - Jan–Nov (masa selain terakhir): Tarif Efektif Bulanan (TER) kategori A/B/C.
 *  - Desember (masa pajak terakhir): rekap setahun dengan tarif progresif
 *    Pasal 17 ayat (1) huruf a UU PPh; selisih terhadap total TER yang sudah
 *    dipotong = koreksi (+/−) pada payslip Desember.
 *
 * Regime "Legacy": metode lama (Gross / Netto / GrossUp) dengan algoritma
 * progresif yang benar — untuk transisi klien lama. TIDAK memakai TER.
 *
 * SEMUA PARAMETER REGULASI DAPAT DI-INJECT lewat argumen `config`.
 * Konstanta di file ini HANYA fallback default; sumber kebenaran produksi
 * adalah database (loader: libs/payroll/config.js → loadTaxConfig):
 *   - tabel terRate  → config.terTables            (tarif efektif bulanan)
 *   - tabel pkp      → config.pasal17Brackets      (tarif progresif tahunan)
 *   - tabel ptkp     → config.ptkpAmounts          (PTKP per kode)
 *   - setupSystem    → config.biayaJabatan.{ratePercent,maxMonthly},
 *                      config.npwpSurchargePercent
 * Perubahan regulasi berikutnya = update DATA (UI pkp/ptkp/terRate yang sudah
 * ada atau seed), TANPA edit kode ini.
 *
 * Semua fungsi menerima/ mengembalikan nilai rupiah sebagai Number atau
 * Decimal-compatible; hasil kembali sebagai Number utuh (tanpa pecahan).
 *
 * CATATAN VERIFIKASI: tabel TER default di bawah disalin dari publikasi resmi
 * (Lampiran PMK 168/2023). Wajib diverifikasi ulang terhadap lampiran PDF
 * resmi sebelum go-live produksi.
 */
const { D, round, roundToThousandDown, minD } = require('./money');

// ---------------------------------------------------------------------------
// DEFAULT (fallback) — produksi memakai data DB via libs/payroll/config.js
// ---------------------------------------------------------------------------

// Tabel TER Bulanan (Lampiran PMK 168/2023)
// Format: [batasAtasBrutoBulanan, ratePersen]. Baris terakhir = batas terbuka.
const TER_A = [
  [5400000, 0], [5650000, 0.25], [5950000, 0.5], [6300000, 0.75], [6750000, 1],
  [7500000, 1.25], [8550000, 1.5], [9650000, 1.75], [10050000, 2], [10350000, 2.25],
  [10700000, 2.5], [11050000, 3], [11600000, 3.5], [12500000, 4], [13750000, 5],
  [15100000, 6], [16950000, 7], [19750000, 8], [24150000, 9], [26450000, 10],
  [28000000, 11], [30050000, 12], [32400000, 13], [35400000, 14], [39100000, 15],
  [43850000, 16], [47800000, 17], [51400000, 18], [56300000, 19], [62200000, 20],
  [68600000, 21], [77500000, 22], [89000000, 23], [103000000, 24], [125000000, 25],
  [157000000, 26], [206000000, 27], [337000000, 28], [454000000, 29], [550000000, 30],
  [695000000, 31], [910000000, 32], [1400000000, 33], [1e12, 34],
];

const TER_B = [
  [6200000, 0], [6500000, 0.25], [6850000, 0.5], [7300000, 0.75], [9200000, 1],
  [10750000, 1.5], [11250000, 2], [11600000, 2.5], [12600000, 3], [13600000, 4],
  [14950000, 5], [16400000, 6], [18450000, 7], [21850000, 8], [26000000, 9],
  [27700000, 10], [29350000, 11], [31450000, 12], [33950000, 13], [37100000, 14],
  [41100000, 15], [45800000, 16], [49500000, 17], [53800000, 18], [58500000, 19],
  [64000000, 20], [71000000, 21], [80000000, 22], [93000000, 23], [109000000, 24],
  [129000000, 25], [163000000, 26], [211000000, 27], [374000000, 28], [459000000, 29],
  [555000000, 30], [704000000, 31], [957000000, 32], [1405000000, 33], [1e12, 34],
];

const TER_C = [
  [6600000, 0], [6950000, 0.25], [7350000, 0.5], [7800000, 0.75], [8850000, 1],
  [9800000, 1.25], [10950000, 1.5], [11200000, 1.75], [12050000, 2], [12950000, 3],
  [14150000, 4], [15550000, 5], [17050000, 6], [19500000, 7], [22700000, 8],
  [26600000, 9], [28100000, 10], [30100000, 11], [32600000, 12], [35400000, 13],
  [38900000, 14], [43000000, 15], [47400000, 16], [51200000, 17], [55800000, 18],
  [60400000, 19], [66700000, 20], [74500000, 21], [83200000, 22], [95600000, 23],
  [110000000, 24], [134000000, 25], [169000000, 26], [221000000, 27], [390000000, 28],
  [463000000, 29], [561000000, 30], [709000000, 31], [965000000, 32], [1419000000, 33],
  [1e12, 34],
];

const TER_TABLES = { A: TER_A, B: TER_B, C: TER_C };

// Tarif progresif Pasal 17 ayat (1) huruf a UU PPh (UU HPP 7/2021)
// Format: [batasAtasPkpTahunan, ratePersen]
const PASAL_17 = [
  [60000000, 5],
  [250000000, 15],
  [500000000, 25],
  [5000000000, 30],
  [Number.MAX_SAFE_INTEGER, 35],
];

/** Biaya jabatan: 5% dari bruto, maks Rp500.000/bulan. */
const BIAYA_JABATAN_RATE = 5;
const BIAYA_JABATAN_MAX_BULANAN = 500000;

/** Surcharge tarif akhir untuk pegawai tanpa NPWP (PP 2/2018): +20%. */
const NPWP_SURCHARGE = 20;

/** Nilai PTKP dasar (Rp) sesuai UU HPP — hanya untuk fallback formula. */
const PTKP_BASE = { TK0: 54000000, TK1_K0: 58500000 };

/**
 * Normalisasi & validasi config. null/undefined/kosong → default fallback.
 *
 * config = {
 *   terTables:            { A|B|C: [[batasAtasBruto, ratePersen], ...] },
 *   pasal17Brackets:      [[batasAtasPkpTahunan, ratePersen], ...],
 *   ptkpAmounts:          { 'TK/0': 54000000, 'K/I/2': 121500000, ... },
 *   biayaJabatan:         { ratePercent: 5, maxMonthly: 500000 },
 *   npwpSurchargePercent: 20,
 * }
 *
 * Tabel diurutkan defensif berdasarkan batas atas agar aman dari data DB.
 */
function normalizeConfig(config) {
  const c = config || {};
  const byUpper = (t) => [...t].sort((a, b) => Number(a[0]) - Number(b[0]));

  const terTables = (c.terTables && Object.keys(c.terTables).length)
    ? c.terTables
    : TER_TABLES;
  const normalizedTer = {};
  for (const cat of Object.keys(terTables)) {
    if (Array.isArray(terTables[cat]) && terTables[cat].length) {
      normalizedTer[cat] = byUpper(terTables[cat]);
    }
  }

  const pasal17 = (c.pasal17Brackets && c.pasal17Brackets.length)
    ? byUpper(c.pasal17Brackets)
    : PASAL_17;

  return {
    terTables: Object.keys(normalizedTer).length ? normalizedTer : TER_TABLES,
    pasal17,
    ptkpAmounts: (c.ptkpAmounts && Object.keys(c.ptkpAmounts).length) ? c.ptkpAmounts : null,
    biayaJabatanRate: (c.biayaJabatan && c.biayaJabatan.ratePercent != null)
      ? Number(c.biayaJabatan.ratePercent) : BIAYA_JABATAN_RATE,
    biayaJabatanMaxMonthly: (c.biayaJabatan && c.biayaJabatan.maxMonthly != null)
      ? Number(c.biayaJabatan.maxMonthly) : BIAYA_JABATAN_MAX_BULANAN,
    npwpSurchargePercent: c.npwpSurchargePercent != null
      ? Number(c.npwpSurchargePercent) : NPWP_SURCHARGE,
  };
}

/**
 * Tentukan kategori TER dari kode PTKP.
 * A: TK/0 | B: TK/1, K/0, TK/2, K/1, TK/3, K/2 | C: K/3, K/I/*
 * (K/I/* disetarakan dengan C; dapat diarahkan via argumen kategori eksplisit
 *  bila kebijakan klien berbeda.)
 */
function getTerCategory(ptkpCode) {
  const code = String(ptkpCode || 'TK/0').toUpperCase().trim();
  if (code === 'TK/0') return 'A';
  if (['TK/1', 'K/0', 'TK/2', 'K/1', 'TK/3', 'K/2'].includes(code)) return 'B';
  return 'C'; // K/3 dan K/I/*
}

/**
 * PPh 21 bulanan via TER. Eksak — tidak dibulatkan ribuan.
 * @returns {Number} PPh terutang bulan tersebut.
 */
function terMonthlyTax(monthlyBrutto, category, config) {
  const cfg = normalizeConfig(config);
  const brutto = D(monthlyBrutto);
  const table = cfg.terTables[category] || cfg.terTables.A || TER_A;
  if (brutto.lte(0)) return 0;
  for (let i = 0; i < table.length; i++) {
    if (brutto.lte(table[i][0])) {
      return round(brutto.times(table[i][1]).div(100)).toNumber();
    }
  }
  const last = table[table.length - 1];
  return round(brutto.times(last[1]).div(100)).toNumber();
}

/** Rate TER (%) untuk bruto tertentu — dipakai untuk tampilan/preview. */
function terRate(monthlyBrutto, category, config) {
  const cfg = normalizeConfig(config);
  const brutto = D(monthlyBrutto);
  const table = cfg.terTables[category] || cfg.terTables.A || TER_A;
  for (let i = 0; i < table.length; i++) {
    if (brutto.lte(table[i][0])) return table[i][1];
  }
  return table[table.length - 1][1];
}

/**
 * PPh tahunan via tarif progresif Pasal 17 atas PKP tahunan.
 * Implementasi benar: potong per lapisan (bukan rate tunggal).
 * @returns {Number}
 */
function progressiveAnnualTax(annualPkp, config) {
  const cfg = normalizeConfig(config);
  let pkp = D(annualPkp);
  if (pkp.lte(0)) return 0;
  let tax = D(0);
  let prev = D(0);
  for (const [limit, rate] of cfg.pasal17) {
    const upper = D(limit);
    const layer = minD(pkp, upper.minus(prev));
    if (layer.lte(0)) break;
    tax = tax.plus(layer.times(rate).div(100));
    pkp = pkp.minus(layer);
    prev = upper;
    if (pkp.lte(0)) break;
  }
  return round(tax).toNumber();
}

/** Biaya jabatan bulanan: min(rate% × bruto, max bulanan). */
function biayaJabatan(monthlyBrutto, config) {
  const cfg = normalizeConfig(config);
  return minD(
    round(D(monthlyBrutto).times(cfg.biayaJabatanRate).div(100)),
    cfg.biayaJabatanMaxMonthly
  ).toNumber();
}

/** Tambahkan surcharge untuk pegawai tanpa NPWP (default +20%). */
function npwpSurcharge(taxAmount, config) {
  const cfg = normalizeConfig(config);
  return round(D(taxAmount).times(100 + cfg.npwpSurchargePercent).div(100)).toNumber();
}

/** Terapkan surcharge NPWP bila perlu. */
function applyNpwpRule(taxAmount, hasNpwp, config) {
  return hasNpwp ? round(D(taxAmount)).toNumber() : npwpSurcharge(taxAmount, config);
}

/**
 * Gross-up iteratif: cari PPh yang memuat dirinya sendiri dalam bruto.
 * Fungsi taxOf(bruttoWithPph) dipanggil berulang hingga konvergen.
 * @param {Function} taxOf bruto(lengkap dgn PPh) -> PPh
 * @returns {Number}
 */
function grossUpIterative(taxOf, maxIterations = 5) {
  let pph = 0;
  for (let i = 0; i < maxIterations; i++) {
    const next = taxOf(pph);
    if (round(D(next)).eq(round(D(pph)))) return next;
    pph = next;
  }
  return pph;
}

/**
 * PPh 21 bulanan regime TER untuk pegawai tetap (Jan–Nov).
 *
 * @param {Object} p
 * @param {Number} p.monthlyBrutto   bruto bulan ini (gaji + tunjangan + lembur + bpjs perusahaan utk gross-up; TANPA PPh)
 * @param {String} p.ptkpCode        mis. 'TK/0'
 * @param {Boolean} p.hasNpwp
 * @param {Boolean} p.grossUp        bila true, brutto dianggap sudah termasuk PPh (gross-up) → diiterasi
 * @param {Object} [p.config]        konfigurasi tarif (lihat normalizeConfig)
 * @returns {{ pph: Number, category: String, rate: Number }}
 */
function calculateMonthlyTax21(p) {
  const {
    monthlyBrutto = 0,
    ptkpCode = 'TK/0',
    hasNpwp = true,
    grossUp = false,
    config = null,
  } = p || {};

  const category = getTerCategory(ptkpCode);

  if (!grossUp) {
    const pph = terMonthlyTax(monthlyBrutto, category, config);
    return { pph: applyNpwpRule(pph, hasNpwp, config), category, rate: terRate(monthlyBrutto, category, config) };
  }

  // Gross-up: bruto bulan ini SUDAH termasuk PPh yang ditanggung perusahaan.
  const pph = grossUpIterative((pphCandidate) => {
    const bruttoWithPph = D(monthlyBrutto).plus(pphCandidate).toNumber();
    return applyNpwpRule(terMonthlyTax(bruttoWithPph, category, config), hasNpwp, config);
  });
  return {
    pph,
    category,
    rate: terRate(D(monthlyBrutto).plus(pph).toNumber(), category, config),
  };
}

/**
 * Koreksi masa pajak terakhir (Desember) — regime TER.
 *
 * Desember memakai rekap setahun: PKP tahunan × tarif Pasal 17, dibandingkan
 * dengan akumulasi TER Jan–Nov yang sudah dipotong. Selisih (+/−) dipotong/
 * dikembalikan di payslip Desember.
 *
 * @param {Object} p
 * @param {Number} p.annualBruttoBase        total bruto Jan–Nov (basis TER, TANPA PPh gross-up) + bruto Desember TANPA PPh
 * @param {Number} p.annualGrossUpPph        total PPh gross-up yang ditanggung perusahaan Jan–Des (0 bila non-gross-up)
 * @param {Number} p.pphTerPaidJanToNov      akumulasi PPh TER yang sudah dipotong Jan–Nov
 * @param {String} p.ptkpCode
 * @param {Boolean} p.hasNpwp
 * @param {Object} [p.config]                konfigurasi tarif (lihat normalizeConfig)
 * @returns {{ pphDecember: Number, annualPph: Number, annualPkp: Number, correction: Number }}
 */
function calculateDecemberAdjustment(p) {
  const {
    annualBruttoBase = 0,
    annualGrossUpPph = 0,
    pphTerPaidJanToNov = 0,
    ptkpCode = 'TK/0',
    hasNpwp = true,
    config = null,
  } = p || {};

  const cfg = normalizeConfig(config);
  const bruttoSetahun = D(annualBruttoBase).plus(annualGrossUpPph);

  // PKP tahunan = bruto − biaya jabatan setahun (max 12 × max bulanan) − PTKP.
  const biayaJabatanSetahun = minD(
    round(bruttoSetahun.times(cfg.biayaJabatanRate).div(100)),
    cfg.biayaJabatanMaxMonthly * 12
  );

  const ptkpAnnual = annualPtkpFor(ptkpCode, cfg);
  const pkp = bruttoSetahun.minus(biayaJabatanSetahun).minus(ptkpAnnual);
  const annualPph = applyNpwpRule(progressiveAnnualTax(pkp.toNumber(), cfg), hasNpwp, cfg);

  const pphDecember = round(D(annualPph).minus(pphTerPaidJanToNov)).toNumber();
  return {
    pphDecember,                       // bisa negatif (koreksi lebih potong)
    annualPph,
    annualPkp: round(pkp).toNumber(),
    correction: pphDecember,
  };
}

/**
 * PTKP tahunan (Rp) dari kode — untuk regime Legacy dan koreksi Desember.
 * Urutan resolusi:
 *   1. Exact match di config.ptkpAmounts (dari tabel ptkp di DB) — SUMBER
 *      KEBENARAN. Memperbaiki fallback formula yang menghitung status kawin
 *      K/I/* dobel (126jt; seed DB benar: K/I/2 = 121.500.000).
 *   2. Fallback formula dari PTKP_BASE hanya bila kode tidak ada di config.
 */
function annualPtkpFor(code, config) {
  const key = String(code || 'TK/0').toUpperCase().trim();
  if (config && config.ptkpAmounts && config.ptkpAmounts[key] != null) {
    return Number(config.ptkpAmounts[key]);
  }

  const base = { TK: PTKP_BASE.TK0, K: PTKP_BASE.TK1_K0 - PTKP_BASE.TK0 };
  const dependent = { 0: 0, 1: 4500000, 2: 9000000, 3: 13500000 };

  if (key.startsWith('K/I/')) {
    const n = Number(key.split('/')[2]) || 0;
    return base.TK + base.K + dependent[n] + PTKP_BASE.TK1_K0; // + status kawin pasangan
  }
  const m = /^(TK|K)\/(\d)$/.exec(key);
  if (!m) return PTKP_BASE.TK0;
  const status = m[1] === 'K' ? base.TK + base.K : base.TK;
  const n = Number(m[2]) || 0;
  return status + dependent[n];
}

/**
 * PPh bulanan regime LEGACY (metode lama, algoritma progresif yang benar).
 * PKP tahunan = (bruto − biaya jabatan) × 12 − PTKP; PPh setahun / 12.
 * GrossUp: diiterasi internal sampai PPh masuk dalam bruto.
 *
 * @param {Object} p
 * @param {Object} [p.config]  konfigurasi tarif (lihat normalizeConfig)
 * @returns {{ pph: Number }}
 */
function calculateLegacyMonthlyTax21(p) {
  const {
    monthlyBrutto = 0,
    ptkpCode = 'TK/0',
    hasNpwp = true,
    method = 'Gross', // Gross | Netto | GrossUp
    config = null,
  } = p || {};

  const cfg = normalizeConfig(config);
  const brutto = D(monthlyBrutto);
  if (brutto.lte(0)) return { pph: 0 };

  const taxFromBrutto = (bruttoValue) => {
    const biayaJab = biayaJabatan(bruttoValue, cfg);
    const netto = D(bruttoValue).minus(biayaJab);
    const pkpTahunan = netto.times(12).minus(annualPtkpFor(ptkpCode, cfg));
    const pkp = pkpTahunan.lte(0) ? D(0) : pkpTahunan;
    return applyNpwpRule(round(progressiveAnnualTax(pkp.toNumber(), cfg) / 12).toNumber(), hasNpwp, cfg);
  };

  if (method === 'GrossUp') {
    return { pph: grossUpIterative((pphCandidate) => taxFromBrutto(brutto.plus(pphCandidate).toNumber())) };
  }
  return { pph: round(taxFromBrutto(brutto.toNumber())).toNumber() };
}

module.exports = {
  // default fallback (ter-ekspos untuk seed/verifikasi)
  TER_TABLES,
  PASAL_17,
  PTKP_BASE,
  BIAYA_JABATAN_RATE,
  BIAYA_JABATAN_MAX_BULANAN,
  NPWP_SURCHARGE,
  // config
  normalizeConfig,
  // fungsi perhitungan
  getTerCategory,
  terMonthlyTax,
  terRate,
  progressiveAnnualTax,
  biayaJabatan,
  npwpSurcharge,
  applyNpwpRule,
  grossUpIterative,
  calculateMonthlyTax21,
  calculateDecemberAdjustment,
  annualPtkpFor,
  calculateLegacyMonthlyTax21,
};
