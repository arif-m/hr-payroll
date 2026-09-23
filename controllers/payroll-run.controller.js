/**
 * payroll-run.controller.js — UI alur DRAFT → SUBMITTED → APPROVED → LOCKED.
 * List run per periode, detail run (ringkasan + per karyawan), dan aksi
 * transisi status. Guard bisnis ada di libs/payroll/run.js & run-state.js.
 */
const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');
const generalHelper = require('../helper/general');
const moment = require('moment');
const logger = require('../libs/logger');
const { getRunSummary, transitionRun, getOrCreateRun } = require('../libs/payroll/run');
const { buildPaymentFile } = require('../libs/payroll/payment-file');
const { buildSptMasa } = require('../libs/payroll/spt-masa');
const { sendPayslipsForRun } = require('../libs/payroll/email-payslip');



const pageParams = (query) => {
  const page = parseInt(query.page) || 0;
  const limit = parseInt(query.limit) || 10;
  return { page, limit, skip: page * limit };
};

const buildMeta = (limit, currentPage, totalCount, totalRecordCurrentPage) => ({
  limit, currentPage,
  totalPage: Math.ceil(totalCount / limit),
  totalRecords: totalCount,
  totalRecordCurrentPage,
});

const currentRecordCount = (page, totalPage, totalCount, limit) => {
  let totalRecordCurrentPage = limit;
  if (page === totalPage - 1 || totalPage === 1) {
    totalRecordCurrentPage = totalCount % limit;
    if (totalRecordCurrentPage === 0) totalRecordCurrentPage = limit;
  }
  return totalRecordCurrentPage;
};

const showIndex = async (req, res) => {
  try {
    const query = req.query;
    const where = {};
    if (query.status && ['DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED'].includes(query.status)) {
      where.status = query.status;
    }

    const { page, limit, skip } = pageParams(query);
    const totalCount = await prisma.payrollRun.count({ where });
    const totalPage = Math.ceil(totalCount / limit);
    const totalRecordCurrentPage = currentRecordCount(page, totalPage, totalCount, limit);

    const getDataRuns = await prisma.payrollRun.findMany({
      skip, take: limit, where,
      orderBy: [{ cutOffPeriod: { yearPeriod: 'desc' } }, { cutOffPeriod: { monthPeriod: 'desc' } }],
      include: {
        cutOffPeriod: { select: { monthPeriod: true, yearPeriod: true, startPeriod: true, endPeriod: true } },
        _count: { select: { runDetail: true } },
      },
    });
    const listOfRuns = { meta: buildMeta(limit, page || 0, totalCount, totalRecordCurrentPage), data: getDataRuns };

    // Periode yang belum closing — kandidat pembuatan run baru.
    const listOfPeriods = await prisma.cutOffPeriod.findMany({
      where: { isClosing: 0 },
      orderBy: [{ yearPeriod: 'desc' }, { monthPeriod: 'desc' }],
      select: { id: true, monthPeriod: true, yearPeriod: true, startPeriod: true, endPeriod: true },
    });

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    res.render('pages/payroll-run/index', {
      user: userInfo, getRoles, search: query.search,
      statusFilter: query.status || '', pageTitle: 'Payroll Run', listOfRuns, listOfPeriods, generalHelper, moment,
    });
  } catch (err) {
    logger.error(`payrollRun showIndex: ${err.message}`);
    res.redirect('/dashboard');
  }
};

const showDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await getRunSummary(Number(id));
    if (!summary) throw new Error('Payroll run tidak ditemukan');

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    res.render('pages/payroll-run/detail', {
      user: userInfo, getRoles, pageTitle: 'Payroll Run Detail',
      run: summary.run, counts: summary.counts, totals: summary.totals, generalHelper, moment,
    });
  } catch (err) {
    logger.error(`payrollRun showDetail: ${err.message}`);
    req.flash('error', err.message);
    res.redirect('/payroll-run');
  }
};

/** Buat (atau ambil) run DRAFT untuk satu periode — dipakai dari halaman list. */
const createRun = async (req, res) => {
  try {
    const { cutoff_period_id } = req.body;
    const run = await getOrCreateRun(Number(cutoff_period_id), req.user.fullName);
    req.flash('success', `Payroll run #${run.id} siap (status DRAFT)`);
    res.redirect(`/payroll-run/${run.id}`);
  } catch (err) {
    logger.error(`payrollRun createRun: ${err.message}`);
    req.flash('error', err.message);
    res.redirect('back');
  }
};

const doTransition = async (req, res) => {
  try {
    const { run_id, action, note } = req.body;
    const run = await transitionRun({
      runId: Number(run_id), action, actor: req.user.fullName,
      note: note && String(note).trim() !== '' ? String(note).trim() : null,
    });
    req.flash('success', `Payroll run #${run.id} sekarang berstatus ${run.status}`);
  } catch (err) {
    logger.error(`payrollRun doTransition: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

/** Download CSV payment file (transfer gaji) — hanya run APPROVED/LOCKED. */
const downloadPaymentFile = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await buildPaymentFile(Number(id));

    if (result.skipped.length > 0) {
      const names = result.skipped.map((s) => s.fullName).slice(0, 5).join(', ');
      const more = result.skipped.length > 5 ? ` +${result.skipped.length - 5} lainnya` : '';
      req.flash('error', `${result.skipped.length} karyawan dilewati (belum ada data rekening): ${names}${more}`);
    } else {
      req.flash('success', `Payment file dibuat: ${result.count} karyawan, total THP Rp ${generalHelper.formatNumberWithCommas(result.totalAmount)}`);
    }

    const month = String(result.run.cutOffPeriod.monthPeriod).padStart(2, '0');
    const filename = `payment-file-${month}-${result.run.cutOffPeriod.yearPeriod}-run${result.run.id}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM agar Excel membaca UTF-8 dengan benar.
    res.send('\uFEFF' + result.csv);
  } catch (err) {
    logger.error(`payrollRun downloadPaymentFile: ${err.message}`);
    req.flash('error', err.message);
    res.redirect('back');
  }
};

/**
 * Download CSV SPT Masa PPh 21 (A1 = pegawai tetap, A2 = bukan pegawai) —
 * hanya run APPROVED/LOCKED. Query: ?form=A1|A2.
 */
const downloadSptMasa = async (req, res) => {
  try {
    const { id } = req.params;
    const form = req.query.form === 'A2' ? 'A2' : 'A1';
    const result = await buildSptMasa(Number(id), { form });

    const month = String(result.run.cutOffPeriod.monthPeriod).padStart(2, '0');
    const filename = `spt-masa-${form.toLowerCase()}-${month}-${result.run.cutOffPeriod.yearPeriod}-run${result.run.id}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM agar Excel membaca UTF-8 dengan benar.
    res.send('\uFEFF' + result.csv);
  } catch (err) {
    logger.error(`payrollRun downloadSptMasa: ${err.message}`);
    req.flash('error', err.message);
    res.redirect('back');
  }
};

/** Kirim payslip via email untuk seluruh payslip run (hanya APPROVED/LOCKED). */
const sendPayslipsEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sendPayslipsForRun(Number(id), req.user.fullName);

    const parts = [];
    if (result.sent > 0) parts.push(`${result.sent} terkirim`);
    if (result.skipped > 0) parts.push(`${result.skipped} dilewati (sudah terkirim / tanpa email)`);
    if (result.failed > 0) parts.push(`${result.failed} gagal`);
    const rekap = parts.length ? parts.join(', ') : 'tidak ada payslip';
    if (result.failed > 0) req.flash('error', `Kirim email payslip: ${rekap}`);
    else req.flash('success', `Kirim email payslip: ${rekap}`);
  } catch (err) {
    logger.error(`payrollRun sendPayslipsEmail: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

module.exports = { showIndex, showDetail, createRun, doTransition, downloadPaymentFile, downloadSptMasa, sendPayslipsEmail };
