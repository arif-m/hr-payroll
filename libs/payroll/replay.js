/**
 * replay.js — verifikasi ulang payslip historis memakai snapshot tarif yang
 * tersimpan saat generate. Menjawab pertanyaan audit: "jika aturan berubah,
 * apakah angka payslip lama masih bisa dijelaskan?" — ya, karena tarif yang
 * dipakai saat itu tersimpan di payslipHeader.taxConfigSnapshot.
 *
 * Prinsip: PPh historis divalidasi dengan SNAPSHOT (bukan tarif DB hari ini).
 * Prasyarat: data sumber (komponen gaji, lembur, kehadiran, BPJS template)
 * masih sama seperti saat generate — kehadiran/lembur berubah jika periode
 * diedit setelahnya, dan itu akan terlihat sebagai selisih (bukan error).
 */
const prisma = require('../prisma');
const { buildPayslip } = require('./engine');

/**
 * Bangun ulang payslip satu karyawan memakai tarif dari snapshot historis.
 * @param {Object} p
 * @param {Number} p.usersId
 * @param {Number} p.monthPeriod  '01'..'12'
 * @param {Number} p.yearPeriod   mis. 2026
 * @returns {Object} { ok, storedPph, recalculatedPph, snapshot, breakdown }
 */
async function replayPayslip({ usersId, monthPeriod, yearPeriod }) {
  const header = await prisma.payslipHeader.findFirst({
    where: { usersId, monthPeriod: String(monthPeriod), yearPeriod: String(yearPeriod) },
    orderBy: { id: 'desc' },
  });
  if (!header) throw new Error(`Payslip ${monthPeriod}/${yearPeriod} usersId=${usersId} tidak ditemukan`);
  if (!header.taxConfigSnapshot) {
    throw new Error('Payslip ini dibuat sebelum fitur snapshot — regenerate untuk membuat snapshot');
  }

  const cutoffPeriod = await prisma.cutOffPeriod.findFirst({
    where: { id: header.cutOffPeriodId },
  });
  if (!cutoffPeriod) throw new Error('Periode cut-off payslip ini sudah tidak ada');

  const built = await buildPayslip({
    usersId,
    cutoffPeriod,
    createdBy: 'replay',
    taxConfig: header.taxConfigSnapshot, // tarif SAAT generate, bukan DB hari ini
  });

  const pick = (code, category) => {
    const row = built.details.find((d) => d.code === code && d.category === category);
    return row ? row.amount : 0;
  };

  const storedPph = await prisma.payslipDetails.aggregate({
    where: { payslipHeaderId: header.id, code: 'TD', category: 'Deductions' },
    _sum: { amount: true },
  });

  const storedThp = await prisma.payslipDetails.findMany({
    where: { payslipHeaderId: header.id, isTakeHomePay: 1 },
    select: { category: true, amount: true },
  });
  const storedThpTotal = storedThp.reduce((a, r) => a + (r.category === 'Earnings' ? Number(r.amount) : -Number(r.amount)), 0);

  const recalcPph = pick('TD', 'Deductions');
  const recalcThp = built.details
    .filter((d) => d.isTakeHomePay === 1)
    .reduce((a, d) => a + (d.category === 'Earnings' ? d.amount : -d.amount), 0);

  return {
    ok: recalcPph === Number(storedPph._sum.amount || 0) && Math.abs(recalcThp - storedThpTotal) < 0.01,
    storedPph: Number(storedPph._sum.amount || 0),
    recalculatedPph: recalcPph,
    storedThp: storedThpTotal,
    recalculatedThp: recalcThp,
    snapshot: header.taxConfigSnapshot,
    breakdown: built.details,
  };
}

module.exports = { replayPayslip };
