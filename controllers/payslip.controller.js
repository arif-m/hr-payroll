const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');

const moment = require('moment');
const generalHelper = require('../helper/general');
const { replayPayslip } = require('../libs/payroll/replay');
const logger = require('../libs/logger');

const showIndex = async (req, res) => {
    const userId = req.user.id;
    const query = req.query;
    let search = query.search;
    where = {
        usersId: userId
    };
    if (query.search){
        where = { 
            OR: [ 
                {
                    monthPeriod: {
                        contains: search                    
                    },
                },
                {
                    yearPeriod: {
                        contains: search                    
                    },
                }
            ],
            usersId: userId
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.payslipHeader.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataPayslip = await prisma.payslipHeader.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            startPeriod: true,
            endPeriod: true,            
            monthPeriod: true,
            yearPeriod: true,
            workDays: true,
            attendance: true,
            usersId: true,
            employeeId: true,
            fullName: true,
            organization: true,
            jobTitle: true,
            ptkp: true,
            npwp: true,
        },
        orderBy: [
            {
                yearPeriod: 'desc',
            },
            {
                monthPeriod: 'desc',
            }
        ]
    })

    const metaData= { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfPayslip = { meta : metaData, data: getDataPayslip};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'Payslip', listOfPayslip: listOfPayslip }; 
    res.render('pages/payslip/index', param);
}

const generatePayslip = async (req, res) => {
    const { uuid } = req.params;    
    const getDataPayslipHeader = await prisma.payslipHeader.findFirst({
        where: {
            uuid: uuid,
        },
        select: {
            id: true,
            uuid: true,
            startPeriod: true,
            endPeriod: true,
            fullName: true,
            employeeId: true,
            workDays: true,
            attendance: true,
            ptkp: true,
            npwp: true,
            organization: true,
            jobTitle: true,
            taxConfigSnapshot: true,
            payrollRun: {
                select: {
                    id: true,
                    paymentStatus: true,
                },
            },
            employee: {
                select: {
                    businessUnit: {
                        select: {
                          id: true,
                          businessUnitName: true,
                          companyName: true,
                          image: true,
                        },
                    },        
                }
            },
        }
    })

    const getDataPayslipDetailsTakeHomePayEarnings = await prisma.payslipDetails.findMany({
        where: {
            payslipHeaderId: getDataPayslipHeader.id,
            isTakeHomePay: 1,
            category: 'Earnings',
        },
        select : {
            code: true,
            name: true,
            amount: true,
            sequence: true,
        },
        orderBy: {
            sequence: 'asc',
        }
    })
    const getDataPayslipDetailsTakeHomePayDeductions = await prisma.payslipDetails.findMany({
        where: {
            payslipHeaderId: getDataPayslipHeader.id,
            isTakeHomePay: 1,
            category: 'Deductions',
        },
        select : {
            code: true,
            name: true,
            amount: true,
            sequence: true,
        },
        orderBy: {
            sequence: 'asc',
        }
    })
    const getDataPayslipDetailsIsNotTakeHomePay = await prisma.payslipDetails.findMany({
        where: {
            payslipHeaderId: getDataPayslipHeader.id,
            isTakeHomePay: 0,
        },
        select : {
            code: true,
            name: true,
            amount: true,
            sequence: true,
        },
        orderBy: {
            sequence: 'asc',
        }
    })
    
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    // Status pembayaran per karyawan bila payslip terhubung ke payroll run.
    let paymentInfo = null;
    if (getDataPayslipHeader.payrollRun && getDataPayslipHeader.payrollRun.id) {
        const runDetailRow = await prisma.payrollRunDetail.findFirst({
            where: { payrollRunId: getDataPayslipHeader.payrollRun.id, usersId: getDataPayslipHeader.usersId },
            select: { paymentStatus: true, paidAt: true },
        });
        if (runDetailRow) {
            paymentInfo = { status: runDetailRow.paymentStatus, paidAt: runDetailRow.paidAt };
        }
    }

    const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'Payslip', getDataPayslipHeader, taxConfigSnapshot: getDataPayslipHeader.taxConfigSnapshot, listOfPayslipTakeHomePayEarnings: getDataPayslipDetailsTakeHomePayEarnings, listOfPayslipTakeHomePayDeductions: getDataPayslipDetailsTakeHomePayDeductions, listOfPayslipBenefits: getDataPayslipDetailsIsNotTakeHomePay, paymentInfo, generalHelper }; 
    res.render('pages/payslip/report', param)
}

const showIndexPayslipAdmin = async (req, res) => {
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search){
        where = { 
            OR: [ 
                {
                    monthPeriod: {
                        contains: search                    
                    },
                },
                {
                    yearPeriod: {
                        contains: search                    
                    },
                }
            ] 
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.cutOffPeriod.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataPeriod = await prisma.cutOffPeriod.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            isActive: true,
            startPeriod: true,
            endPeriod: true,            
            monthPeriod: true,
            yearPeriod: true,
            workDays: true,
        },
        orderBy: [
            {
                yearPeriod: 'desc',
            },
            {
                monthPeriod: 'desc',
            }
        ]
    })

    const metaData= { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfDataPeriod = { meta : metaData, data: getDataPeriod};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'Payslip (Admin)', listOfDataPeriod: listOfDataPeriod }; 
    res.render('pages/payslip-admin/index', param);
}

const showListOfEmployee = async (req, res) => {
    const { uuid } = req.params;
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const getDataCutoffPeriod = await prisma.cutOffPeriod.findFirst({
        where: {
            uuid: uuid,
        },
        select: {
            id: true,
            uuid: true,
            monthPeriod: true,
            yearPeriod: true,
            startPeriod: true,
            endPeriod: true,
        }
    })

    const userId = req.user.id;
    const query = req.query;
    let search = query.search;
    where = {
        cutOffPeriodId: Number(getDataCutoffPeriod.id),
    };
    if (query.search){
        where = { 
            OR: [ 
                {
                    monthPeriod: {
                        contains: search                    
                    },
                },
                {
                    yearPeriod: {
                        contains: search                    
                    },
                },
                {
                    fullName: {
                        contains: search                    
                    },
                },
                {
                    organization: {
                        contains: search                    
                    },
                },
                {
                    jobTitle: {
                        contains: search                    
                    },
                },
            ],
            cutOffPeriodId: Number(getDataCutoffPeriod.id),
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.payslipHeader.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    const currentPage = page || 0;

    const getDataPayslip = await prisma.payslipHeader.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            startPeriod: true,
            endPeriod: true,            
            monthPeriod: true,
            yearPeriod: true,
            workDays: true,
            attendance: true,
            usersId: true,
            employeeId: true,
            fullName: true,
            organization: true,
            jobTitle: true,
            ptkp: true,
            npwp: true,
        },
        orderBy: [
            {
                yearPeriod: 'desc',
            },
            {
                monthPeriod: 'desc',
            }
        ]
    })

    const metaData= { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount};
    const listOfPayslipHeader = { meta : metaData, data: getDataPayslip};

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'List of Employee', getDataCutoffPeriod, listOfPayslipHeader }; 
    res.render('pages/payslip-admin/list-of-employee', param);
}

const payslipAdminReport = async (req, res) => {
    const { uuid } = req.params;    
    const getDataPayslipHeader = await prisma.payslipHeader.findFirst({
        where: {
            uuid: uuid,
        },
        select: {
            id: true,
            uuid: true,
            startPeriod: true,
            endPeriod: true,
            fullName: true,
            employeeId: true,
            workDays: true,
            attendance: true,
            ptkp: true,
            npwp: true,
            organization: true,
            jobTitle: true,
            taxConfigSnapshot: true,
            payrollRun: {
                select: {
                    id: true,
                    paymentStatus: true,
                },
            },
            employee: {
                select: {
                    businessUnit: {
                        select: {
                          id: true,
                          businessUnitName: true,
                          companyName: true,
                          image: true,
                        },
                    },        
                }
            },
        }
    })

    const getDataPayslipDetailsTakeHomePayEarnings = await prisma.payslipDetails.findMany({
        where: {
            payslipHeaderId: getDataPayslipHeader.id,
            isTakeHomePay: 1,
            category: 'Earnings',
        },
        select : {
            code: true,
            name: true,
            amount: true,
            sequence: true,
        },
        orderBy: {
            sequence: 'asc',
        }
    })
    const getDataPayslipDetailsTakeHomePayDeductions = await prisma.payslipDetails.findMany({
        where: {
            payslipHeaderId: getDataPayslipHeader.id,
            isTakeHomePay: 1,
            category: 'Deductions',
        },
        select : {
            code: true,
            name: true,
            amount: true,
            sequence: true,
        },
        orderBy: {
            sequence: 'asc',
        }
    })
    const getDataPayslipDetailsIsNotTakeHomePay = await prisma.payslipDetails.findMany({
        where: {
            payslipHeaderId: getDataPayslipHeader.id,
            isTakeHomePay: 0,
        },
        select : {
            code: true,
            name: true,
            amount: true,
            sequence: true,
        },
        orderBy: {
            sequence: 'asc',
        }
    })
    
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    // Status pembayaran per karyawan bila payslip terhubung ke payroll run.
    let paymentInfo = null;
    if (getDataPayslipHeader.payrollRun && getDataPayslipHeader.payrollRun.id) {
        const runDetailRow = await prisma.payrollRunDetail.findFirst({
            where: { payrollRunId: getDataPayslipHeader.payrollRun.id, usersId: getDataPayslipHeader.usersId },
            select: { paymentStatus: true, paidAt: true },
        });
        if (runDetailRow) {
            paymentInfo = { status: runDetailRow.paymentStatus, paidAt: runDetailRow.paidAt };
        }
    }

    const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'Payslip', getDataPayslipHeader, taxConfigSnapshot: getDataPayslipHeader.taxConfigSnapshot, listOfPayslipTakeHomePayEarnings: getDataPayslipDetailsTakeHomePayEarnings, listOfPayslipTakeHomePayDeductions: getDataPayslipDetailsTakeHomePayDeductions, listOfPayslipBenefits: getDataPayslipDetailsIsNotTakeHomePay, paymentInfo, generalHelper }; 
    res.render('pages/payslip/report', param)
}

/**
 * Replay (verifikasi ulang) payslip memakai snapshot tarif yang tersimpan
 * saat generate. Hasil ditampilkan via flash modal di payslip report.
 * Aman: read-only, tidak mengubah payslip sama sekali.
 */
const replayPayslipAction = async (req, res) => {
    try {
        const { uuid } = req.body;
        const header = await prisma.payslipHeader.findFirst({ where: { uuid }, select: { usersId: true, monthPeriod: true, yearPeriod: true } });
        if (!header) throw new Error('Payslip tidak ditemukan');

        const r = await replayPayslip({
            usersId: header.usersId,
            monthPeriod: header.monthPeriod,
            yearPeriod: header.yearPeriod,
        });
        const fmt = (n) => generalHelper.formatNumberWithCommas(n);
        if (r.ok) {
            req.flash('success',
                `Verifikasi OK: PPh 21 & THP cocok dengan hitung ulang dari snapshot tarif. ` +
                `PPh: ${fmt(r.storedPph)} = ${fmt(r.recalculatedPph)}; ` +
                `THP: ${fmt(r.storedThp)} = ${fmt(r.recalculatedThp)}`);
        } else {
            req.flash('error',
                `Selisih ditemukan (data sumber mungkin berubah setelah generate). ` +
                `PPh tersimpan ${fmt(r.storedPph)} vs hitung ulang ${fmt(r.recalculatedPph)}; ` +
                `THP tersimpan ${fmt(r.storedThp)} vs hitung ulang ${fmt(r.recalculatedThp)}`);
        }
    } catch (err) {
        logger.error(`replayPayslipAction: ${err.message}`);
        req.flash('error', err.message);
    }

    const back = req.get('referer') || '/payslip-admin';
    res.redirect(back);
};

module.exports = {
    showIndex,
    generatePayslip,
    showIndexPayslipAdmin,
    showListOfEmployee,
    payslipAdminReport,
    replayPayslipAction,
}
