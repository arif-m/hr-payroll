/**
 * employment-history.controller.js — UI riwayat kepegawaian efektif-tanggal.
 *
 * index : daftar karyawan aktif (pintu masuk ke riwayatnya).
 * detail: timeline perubahan (gaji, jabatan, divisi, status, PTKP)
 *         + kalkulator "gaji/jabatan pada tanggal X" via
 *         libs/payroll/employment-history.
 */
const prisma = require('../libs/prisma');
const moment = require('moment');
const { listRolesPermission } = require('../helper/roles-permission');
const generalHelper = require('../helper/general');
const logger = require('../libs/logger');
const employmentHistory = require('../libs/payroll/employment-history');

const CHANGE_BADGE = {
  INITIAL: 'bg-secondary',
  CHANGE_DETAIL: 'bg-blue',
  ADD_COMPONENT: 'bg-green',
  CHANGE_COMPONENT: 'bg-orange',
  STATUS_CHANGE: 'bg-purple',
};

const formatComponents = (components) =>
  (components || []).map((c) => `${c.componentName}: ${generalHelper.formatNumberWithCommas(c.amount)}`).join(', ');

const listingEmployeeWithHistory = async (req, res) => {
  try {
    const query = req.query;
    const where = { status: 'Active' };
    if (query.search) {
      where.fullName = { contains: query.search };
    }

    const employees = await prisma.users.findMany({
      where,
      select: {
        id: true, uuid: true, fullName: true, employeeId: true, joinDate: true,
        employmentStatus: true,
        jobTitle: { select: { jobTitleName: true } },
        division: { select: { divisionName: true } },
        _count: { select: { employmentHistories: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    res.render('pages/employment-history/index', {
      user: userInfo,
      moment, // konvensi project: view memakai moment via param render
      getRoles,
      pageTitle: 'Riwayat Kepegawaian',
      employees,
      search: query.search || '',
      generalHelper,
    });
  } catch (err) {
    logger.error(`listingEmployeeWithHistory: ${err.message}`);
    res.redirect('/dashboard');
  }
};

const showEmploymentHistoryDetail = async (req, res) => {
  try {
    const { uuid } = req.params;
    const queryDate = req.query.as_of; // YYYY-MM-DD untuk kalkulator

    const employee = await prisma.users.findUnique({
      where: { uuid },
      select: {
        id: true, uuid: true, fullName: true, employeeId: true, joinDate: true,
        employmentStatus: true,
        jobTitle: { select: { jobTitleName: true } },
        division: { select: { divisionName: true } },
      },
    });
    if (!employee) throw new Error('Karyawan tidak ditemukan');

    // Backfill lazy bila belum ada riwayat (kondisi sekarang sejak joinDate).
    await employmentHistory.ensureHistory(prisma, employee.id, req.user.fullName);

    const rows = await prisma.employmentHistory.findMany({
      where: { usersId: employee.id },
      orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
    });

    const timeline = rows.map((r) => ({
      ...r,
      badge: CHANGE_BADGE[r.changeType] || 'bg-dark',
      componentsText: formatComponents(
        typeof r.salaryComponents === 'string'
          ? (() => { try { return JSON.parse(r.salaryComponents); } catch { return []; } })()
          : r.salaryComponents,
      ),
      totalFixed: generalHelper.formatNumberWithCommas(
        reconstructTotal(r.salaryComponents),
      ),
    }));

    // Kalkulator "gaji pada tanggal X".
    let asOfResult = null;
    if (queryDate) {
      const snap = await employmentHistory.getSalaryAt(prisma, employee.id, queryDate, req.user.fullName);
      if (snap) {
        asOfResult = {
          date: queryDate,
          jobTitleName: snap.jobTitleName,
          divisionName: snap.divisionName,
          employmentStatus: snap.employmentStatus,
          ptkpCode: snap.ptkpCode,
          components: snap.salaryComponents,
          totalFixed: generalHelper.formatNumberWithCommas(snap.totalFixedIncome),
        };
      }
    }

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    res.render('pages/employment-history/detail', {
      user: userInfo,
      moment, // konvensi project: view memakai moment via param render
      getRoles,
      pageTitle: `Riwayat Kepegawaian — ${employee.fullName}`,
      employee,
      timeline,
      asOfResult,
      asOfInput: queryDate || '',
      generalHelper,
    });
  } catch (err) {
    logger.error(`showEmploymentHistoryDetail: ${err.message}`);
    res.redirect('/employment-history');
  }
};

const reconstructTotal = (salaryComponents) => {
  try {
    const arr = typeof salaryComponents === 'string' ? JSON.parse(salaryComponents) : salaryComponents;
    return (Array.isArray(arr) ? arr : []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  } catch { return 0; }
};

module.exports = { listingEmployeeWithHistory, showEmploymentHistoryDetail };
