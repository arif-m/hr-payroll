/**
 * generate-salary.controller.js — versi refactor.
 *
 * Perubahan utama vs versi lama:
 *  - Seluruh logika perhitungan dipindah ke libs/payroll/engine.js; kedua
 *    jalur (per-karyawan & semua-karyawan) memanggil SATU buildPayslip().
 *  - Satu transaksi DB per karyawan: hapus payslip lama (jika ada) lalu buat
 *    yang baru → re-run idempotent, tidak ada lagi payslip dobel.
 *  - Periode yang sudah di-closing tidak bisa digenerate/diubah.
 *  - Sudah tidak ada parseInt(amount) — engine bekerja dengan Decimal.
 */
const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');
const moment = require('moment');
const logger = require('../libs/logger');
const { persistPayslip } = require('../libs/payroll/persist');
const { loadTaxConfig } = require('../libs/payroll/config');
const { getOrCreateRun, assertRunWritable, generateRunEmployees } = require('../libs/payroll/run');



const pageParams = (query) => {
  const page = parseInt(query.page) || 0;
  const limit = parseInt(query.limit) || 10;
  const skip = page * limit;
  return { page, limit, skip };
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

const getSetupSystem = () => prisma.setupSystem.findFirst({
  select: {
    defaultTaxMethod: true, taxRegime: true, taxCalculationMethod: true,
    thrBudgetBaseCodes: true, thrEligibilityMonths: true, thrProrateRoundDays: true,
  },
});

/** Pastikan periode belum closing sebelum menulis payslip. */
async function assertPeriodOpen(cutoffPeriodId) {
  const period = await prisma.cutOffPeriod.findFirst({
    where: { id: Number(cutoffPeriodId) },
    select: { id: true, isClosing: true },
  });
  if (!period) throw new Error('Periode cut-off tidak ditemukan');
  if (period.isClosing === 1) {
    throw new Error('Periode sudah di-closing dan tidak bisa diubah');
  }
  return period;
}

// ---------------------------------------------------------------------------
// Halaman daftar & form periode (tidak berubah perilakunya)
// ---------------------------------------------------------------------------

const showIndex = async (req, res) => {
  const query = req.query;
  let where = {};
  if (query.search) {
    where = {
      OR: [
        { monthPeriod: { contains: query.search } },
        { yearPeriod: { contains: query.search } },
      ],
    };
  }

  const { page, limit, skip } = pageParams(query);
  const totalCount = await prisma.cutOffPeriod.count({ where });
  const totalPage = Math.ceil(totalCount / limit);
  const totalRecordCurrentPage = currentRecordCount(page, totalPage, totalCount, limit);

  const getDataGenerateSalary = await prisma.cutOffPeriod.findMany({
    skip, take: limit, where,
    select: { id: true, uuid: true, isActive: true, startPeriod: true, endPeriod: true, monthPeriod: true, yearPeriod: true, workDays: true, isClosing: true },
    orderBy: [{ yearPeriod: 'desc' }, { monthPeriod: 'desc' }],
  });

  const listOfGenerateSalary = {
    meta: buildMeta(limit, page || 0, totalCount, totalRecordCurrentPage),
    data: getDataGenerateSalary,
  };

  const userInfo = req.user;
  const getRoles = await listRolesPermission(userInfo.roleUuid);
  const param = { user: userInfo, moment, getRoles, search: query.search, pageTitle: 'Setup Cutoff Period', listOfGenerateSalary };
  res.render('pages/generate-salary/index', param);
};

const createDataGenerateSalary = async (req, res) => {
  try {
    const { month_period, year_period, start_period, end_period, work_days, is_thr } = req.body;
    const startPeriod = start_period.split('-')[2] + '-' + start_period.split('-')[1] + '-' + start_period.split('-')[0];
    const endPeriod = end_period.split('-')[2] + '-' + end_period.split('-')[1] + '-' + end_period.split('-')[0];

    await prisma.cutOffPeriod.create({
      data: {
        monthPeriod: month_period,
        yearPeriod: year_period,
        startPeriod: moment.utc(startPeriod).toDate(),
        endPeriod: moment.utc(endPeriod).toDate(),
        workDays: Number(work_days) || 0,
        isThr: Number(is_thr) === 1 ? 1 : 0,
        createdBy: req.user.fullName,
        updatedBy: req.user.fullName,
      },
    });
    req.flash('success', 'Cutoff period berhasil ditambahkan');
  } catch (err) {
    logger.error(`createDataGenerateSalary: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

const updateDataGenerateSalary = async (req, res) => {
  try {
    const { cutoff_period_uuid, month_period, year_period, start_period, end_period, work_days, is_active, is_thr } = req.body;

    const existing = await prisma.cutOffPeriod.findFirst({ where: { uuid: cutoff_period_uuid } });
    if (!existing) throw new Error('Cutoff period tidak ditemukan');
    if (existing.isClosing === 1) throw new Error('Periode sudah di-closing dan tidak bisa diubah');

    const startPeriod = start_period.split('-')[2] + '-' + start_period.split('-')[1] + '-' + start_period.split('-')[0];
    const endPeriod = end_period.split('-')[2] + '-' + end_period.split('-')[1] + '-' + end_period.split('-')[0];

    await prisma.cutOffPeriod.update({
      where: { uuid: cutoff_period_uuid },
      data: {
        monthPeriod: month_period,
        yearPeriod: year_period,
        startPeriod: moment.utc(startPeriod).toDate(),
        endPeriod: moment.utc(endPeriod).toDate(),
        isActive: Number(is_active),
        isThr: Number(is_thr) === 1 ? 1 : 0,
        workDays: Number(work_days) || 0,
        updatedBy: req.user.fullName,
      },
    });
    req.flash('success', 'Cutoff period berhasil diubah');
  } catch (err) {
    logger.error(`updateDataGenerateSalary: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

const showGenerate = async (req, res) => {
  const { uuid } = req.params;
  const userInfo = req.user;
  const getRoles = await listRolesPermission(userInfo.roleUuid);

  const getDataCutoffPeriod = await prisma.cutOffPeriod.findFirst({
    where: { uuid },
    select: { id: true, uuid: true, monthPeriod: true, yearPeriod: true, startPeriod: true, endPeriod: true, workDays: true, isClosing: true },
  });

  const listOfEmployeePayslipHeader = await prisma.payslipHeader.findMany({
    where: { cutOffPeriodId: getDataCutoffPeriod.id },
    select: { usersId: true },
  });
  const idsEmployee = [0, ...listOfEmployeePayslipHeader.map((x) => x.usersId)];
  const idList = idsEmployee.join(',');

  const query = req.query;
  const search = query.search;
  const { page, limit, skip } = pageParams(query);

  // search di-escape ketat; limit/skip adalah hasil parseInt (aman).
  const searchClause = search
    ? `AND (fullName LIKE '%${String(search).replace(/['"\\]/g, '')}%' OR address LIKE '%${String(search).replace(/['"\\]/g, '')}%')`
    : '';

  const totalCountRows = await prisma.$queryRawUnsafe(
    `SELECT count(*) AS total FROM users
     WHERE id NOT IN (${idList}) AND salaryTemplateHeaderId IS NOT NULL ${searchClause}`
  );
  const totalCount = Number(totalCountRows[0].total);
  const totalPage = Math.ceil(totalCount / limit);
  const totalRecordCurrentPage = currentRecordCount(page, totalPage, totalCount, limit);

  const getDataGenerateSalary = await prisma.$queryRawUnsafe(
    `SELECT uuid, employeeId, fullName, address, divisionName, jobTitleName
     FROM users
     JOIN division ON division.id = users.divisionId
     JOIN jobTitle ON users.jobTitleId = jobTitle.id
     WHERE users.id NOT IN (${idList}) AND salaryTemplateHeaderId IS NOT NULL ${searchClause}
     LIMIT ${limit} OFFSET ${skip}`
  );

  const listOfPayslipHeader = {
    meta: buildMeta(limit, page || 0, totalCount, totalRecordCurrentPage),
    data: getDataGenerateSalary,
  };

  const param = { user: userInfo, moment, getRoles, search, pageTitle: 'Generate Salary', getDataCutoffPeriod, listOfPayslipHeader };
  res.render('pages/generate-salary/generate', param);
};

// ---------------------------------------------------------------------------
// Proses generate
// ---------------------------------------------------------------------------

const processGenerateSalaryByEmployee = async (req, res) => {
  try {
    // dukung POST form (body) dan GET legacy (params)
    const cutoff_period_id = req.body.cutoff_period_id ?? req.params.cutoffPeriodId;
    const employee_uuid = req.body.employee_uuid ?? req.params.employeeUuid;
    const createdBy = req.user.fullName;

    await assertPeriodOpen(cutoff_period_id);
    const run = await getOrCreateRun(Number(cutoff_period_id), createdBy);
    assertRunWritable(run);

    const user = await prisma.users.findFirst({ where: { uuid: employee_uuid }, select: { id: true, fullName: true } });
    if (!user) throw new Error('Karyawan tidak ditemukan');

    // Satu mesin dengan Generate All: payslip + payrollRunDetail OK/FAILED.
    const result = await generateRunEmployees({ runId: run.id, employeeIds: [user.id], createdBy });
    if (result.processed < 1) {
      throw new Error(result.failures[0] || 'Generate gagal untuk karyawan ini');
    }

    req.flash('success', 'Process generate salary successfully');
  } catch (err) {
    logger.error(`processGenerateSalaryByEmployee: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

const processGenerateSalaryAllEmployee = async (req, res) => {
  try {
    const { cutoff_period_id_all } = req.body;
    const createdBy = req.user.fullName;

    await assertPeriodOpen(cutoff_period_id_all);
    const run = await getOrCreateRun(Number(cutoff_period_id_all), createdBy);
    assertRunWritable(run);

    // Satu mesin dengan jalur per-karyawan & Payroll Run: hasil per karyawan
    // (OK/FAILED + angka) ikut tercatat di payrollRunDetail.
    const result = await generateRunEmployees({ runId: run.id, createdBy });

    if (result.processed >= 1) {
      req.flash('success', `Process generate salary successful for ${result.processed} employee(s)`);
      if (result.failed) req.flash('error', `Gagal: ${result.failures.slice(0, 5).join('; ')}`);
    } else {
      req.flash('error', 'There are no data to processed !!!');
    }
  } catch (err) {
    logger.error(`processGenerateSalaryAllEmployee: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

module.exports = {
  showIndex,
  createDataGenerateSalary,
  updateDataGenerateSalary,
  showGenerate,
  processGenerateSalaryByEmployee,
  processGenerateSalaryAllEmployee,
};
