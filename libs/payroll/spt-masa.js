/**
 * spt-masa.js — Export CSV "SPT Masa" PPh Pasal 21 (bukti potong bulanan)
 * dari payroll run berstatus APPROVED/LOCKED.
 *
 * Dua varian:
 *   - Form A1: Pegawai Tetap — memuat kolom Kode PTKP (pemetaan 0–11 e-SPT).
 *   - Form A2: Pegawai Tidak Tetap / Bukan Pegawai — tanpa kolom PTKP.
 *
 * Sumber data: payslip milik run (PayslipHeader.payrollRunId), dengan
 *   - Penghasilan bruto = Σ payslipDetails kategori "Earnings" yang ikut dasar
 *     pajak (isTaxBase = 1) — persis definisi yang dipakai engine saat
 *     menghitung PPh21, termasuk baris TA (PPh21 ditanggung perusahaan /
 *     gross-up). Baris informasi perusahaan (mis. BPJS bagian perusahaan,
 *     isTaxBase = 0) tidak dihitung.
 *   - PPh21 = Σ payslipDetails berkode "TD" (boleh negatif pada Desember
 *     karena koreksi setahun).
 *
 * CATATAN: ini adalah CSV bahan rekap (pola kolom mengikuti format umum
 * e-SPT 1721-A1/A2), BUKAN file XML e-SPT resmi — format resmi DJP diimpor
 * lewat aplikasi e-SPT kantor.
 */
const prisma = require('../prisma');
const { csvField } = require('./payment-file');

const SPT_HEADER_A1 = 'Masa Pajak,Tahun Pajak,NPWP,Nama Pegawai,Kode PTKP,Jumlah Bruto (Rp),Jumlah PPh21 (Rp)';
const SPT_HEADER_A2 = 'Masa Pajak,Tahun Pajak,NPWP,Nama,Jumlah Bruto (Rp),Jumlah PPh21 (Rp)';

/**
 * Normalisasi NPWP menjadi deretan digit (15 digit NPWP lama, atau 16 digit
 * NIK-sebagai-NPWP). Mengembalikan string kosong bila tidak ada.
 */
function normalizeNpwp(npwp) {
  return String(npwp || '').replace(/\D/g, '');
}

/**
 * Pemetaan kode PTKP → angka "Kode Pajak" e-SPT (0–11):
 * TK/0–3 = 0–3, K/0–3 = 4–7, K/I/0–3 = 8–11.
 */
function ptkpCodeToNumber(ptkp) {
  const code = String(ptkp || 'TK/0').toUpperCase().trim();
  const m = code.match(/^(K\/I|K|TK)\/(\d)$/);
  if (!m) return 0;
  const base = m[1] === 'TK' ? 0 : m[1] === 'K' ? 4 : 8;
  return base + Number(m[2]);
}

/**
 * Bangun baris CSV SPT Masa dari kumpulan payslip in-memory (pure function,
 * tanpa DB — agar bisa di-unit-test).
 *
 * @param {Array<Object>} payslips — minimal { fullName, npwp, ptkp, monthPeriod, yearPeriod, payslip_details: [{ code, category, isTaxBase, amount }] }
 * @param {'A1'|'A2'} form
 * @returns {{ csv: String, count: Number, totalPph: Number, totalBruto: Number, warnings: String[] }}
 */
function buildSptRows(payslips, form) {
  const isA1 = String(form).toUpperCase() !== 'A2'; // default A1; validasi ketat ada di buildSptMasa
  const header = isA1 ? SPT_HEADER_A1 : SPT_HEADER_A2;
  const rows = [];
  const warnings = [];
  let totalPph = 0;
  let totalBruto = 0;

  for (const ps of payslips) {
    const details = ps.payslip_details || [];
    let bruto = 0;
    let pph = 0;
    for (const d of details) {
      const amount = Number(d.amount) || 0;
      if (d.code === 'TD') pph += amount;
      else if (d.category === 'Earnings' && Number(d.isTaxBase) === 1) bruto += amount;
    }
    totalBruto += bruto;
    totalPph += pph;

    const npwp = normalizeNpwp(ps.npwp);
    if (!npwp) warnings.push(`${ps.fullName} (NPWP kosong)`);

    const masa = Number(ps.monthPeriod); // 1–12
    const tahun = ps.yearPeriod;
    const base = [
      String(masa),
      String(tahun),
      npwp,
      ps.fullName,
    ];
    if (isA1) base.push(String(ptkpCodeToNumber(ps.ptkp)));
    base.push(bruto.toFixed(2), pph.toFixed(2));
    rows.push(base.map(csvField).join(','));
  }

  const csv = [header, ...rows].join('\r\n') + '\r\n';
  return { csv, count: rows.length, totalPph, totalBruto, warnings };
}

/**
 * Bangun CSV SPT Masa untuk satu payroll run (hanya APPROVED/LOCKED).
 * @param {Number} runId
 * @param {{ form?: 'A1'|'A2' }} opts
 * @returns {Promise<{run: Object, form: String, csv: String, count: Number, totalPph: Number, totalBruto: Number, warnings: String[]}>}
 */
async function buildSptMasa(runId, opts = {}) {
  const form = String(opts.form || 'A1').toUpperCase();
  if (!['A1', 'A2'].includes(form)) {
    throw new Error('Form SPT Masa tidak dikenal (gunakan A1 atau A2)');
  }

  const run = await prisma.payrollRun.findUnique({
    where: { id: Number(runId) },
    include: { cutOffPeriod: { select: { monthPeriod: true, yearPeriod: true } } },
  });
  if (!run) throw new Error('Payroll run tidak ditemukan');
  if (!['APPROVED', 'LOCKED'].includes(run.status)) {
    throw new Error(`SPT Masa hanya tersedia untuk run APPROVED/LOCKED (run ini ${run.status})`);
  }

  const payslips = await prisma.payslipHeader.findMany({
    where: { payrollRunId: run.id },
    select: {
      fullName: true,
      npwp: true,
      ptkp: true,
      monthPeriod: true,
      yearPeriod: true,
      payslip_header: { select: { code: true, category: true, isTaxBase: true, amount: true } },
    },
    orderBy: { fullName: 'asc' },
  });

  if (payslips.length === 0) {
    throw new Error('Tidak ada payslip pada run ini — jalankan Generate Salary terlebih dahulu');
  }

  const result = buildSptRows(payslips, form);
  return { run, form, ...result };
}

module.exports = { buildSptMasa, buildSptRows, normalizeNpwp, ptkpCodeToNumber, csvField };
