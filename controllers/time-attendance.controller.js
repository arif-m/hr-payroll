const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');

const moment = require('moment');
const { isExistTimeAttendanceEmployee } = require('../helper/general');

// list by admin
const listingAllDataTimeAttendance = async (req, res) => {
    try {
        const query = req.query;
        let employee = query.employee;
        let dateFrom = query.date_from;
        let dateFromFiltering = '';
        let dateTo = query.date_to;
        let dateToFiltering = '';
        if (query.date_from)
            dateFromFiltering = dateFrom.split("-")[2] + '-' + dateFrom.split("-")[1] + '-' + dateFrom.split("-")[0];
        if (query.date_to)
            dateToFiltering = dateTo.split("-")[2] + '-' + dateTo.split("-")[1] + '-' + dateTo.split("-")[0];
    
        let where = {};
        if (employee) {
            where = {
                employeeId: Number(employee),
            }
        }
        if (dateFrom && dateTo) {
            where = {
                AND: [
                    { workDate: {
                            gte: moment.utc(dateFromFiltering).toDate(),
                        }
                    },
                    { workDate: {
                        lte: moment.utc(dateToFiltering).toDate(),
                    }
                },
                ]
            }
        }
        if (employee && dateFrom && dateTo) {
            where = {
                AND: [
                    { employeeId: Number(employee) },
                    { workDate: {
                            gte: moment.utc(dateFromFiltering).toDate(),
                        }
                    },
                    { workDate: {
                        lte: moment.utc(dateToFiltering).toDate(),
                    }
                },
                ]
            }
        }

        const page = parseInt(query.page) || 0;
        const limit = parseInt(query.limit) || 10;
        const skip = page * limit;
    
        const totalCount = await prisma.timeAttendance.count({ where, });
        const totalPage = Math.ceil(totalCount / limit);
        let totalRecordCurrentPage = limit;
        if (page == (totalPage - 1) || totalPage == 1) {
            totalRecordCurrentPage = totalCount % limit;
            if(totalRecordCurrentPage == 0)
                totalRecordCurrentPage = limit;
        }
        const currentPage = page || 0;
    
        const getDataTimeAttendance = await prisma.timeAttendance.findMany({
            skip: skip,
            take: limit,
            where,
            select: {
                id: true,
                employeeId: true,
                status: true,
                workDate: true,
                checkIn: true,
                checkOut: true,
                employeeId: true,
                fullName: true,
                businessUnitId: true,
                businessUnitName: true,
                divisionId: true,
                divisionName: true,
                jobTitleId: true,
                jobTitleName: true,
                reason: true,
            },
            orderBy: {
                workDate: 'desc',
            }
        })
                
        const metaData = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
        const listOfTimeAttendance = { meta : metaData, data: getDataTimeAttendance};
    
        const listOfEmployee = await prisma.users.findMany({
            where: {
                status: 'Active',
            },
            select: {
                id: true,
                fullName: true,
                email: true,
            }
        })
    
        const userInfo = req.user;
        const getRoles = await listRolesPermission(userInfo.roleUuid);
    
        param = { user: userInfo, getRoles, employee, dateFrom, dateTo, moment, pageTitle : 'Time Attendance', listOfTimeAttendance, listOfEmployee }
        res.render('pages/time-attendance/index-admin', param);
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('back');
    }
}

const timeAttendanceReportByAdmin = async(req, res) => {
    /*var array = [{ shape: 'square', color: 'red', used: 1, instances: 1 }, { shape: 'square', color: 'red', used: 2, instances: 1 }, { shape: 'circle', color: 'blue', used: 0, instances: 0 }, { shape: 'square', color: 'blue', used: 4, instances: 4 }, { shape: 'circle', color: 'red', used: 1, instances: 1 }, { shape: 'circle', color: 'red', used: 1, instances: 0 }, { shape: 'square', color: 'blue', used: 4, instances: 5 }, { shape: 'square', color: 'red', used: 2, instances: 1 }],

    hash = Object.create(null),
    grouped = [];

    array.forEach(function (o) {
        var key = ['shape', 'color'].map(function (k) { return o[k]; }).join('|');

        if (!hash[key]) {
            hash[key] = { shape: o.shape, color: o.color, YourArrayName : [] };
            grouped.push(hash[key]);
        }
        ['used'].forEach(function (k) { hash[key]['YourArrayName'].push({ used : o['used'], instances : o['instances'] }) });
    });
    console.log(grouped);
    return; */
     
    const query = req.query;
    const employee = query.employee;
    let dateFrom = query.date_from;
    let dateFromFiltering = '';
    let dateTo = query.date_to;
    let dateToFiltering = '';
    if (query.date_from)
        dateFromFiltering = dateFrom.split("-")[2] + '-' + dateFrom.split("-")[1] + '-' + dateFrom.split("-")[0];
    if (query.date_to)
        dateToFiltering = dateTo.split("-")[2] + '-' + dateTo.split("-")[1] + '-' + dateTo.split("-")[0];

    let where = {};
    if (employee) {
        where = {
            employeeId: Number(employee),
        }
    }
    if (dateFrom && dateTo) {
        where = {
            AND: [
                { workDate: {
                        gte: moment.utc(dateFromFiltering).toDate(),
                    }
                },
                { workDate: {
                    lte: moment.utc(dateToFiltering).toDate(),
                }
            },
            ]
        }
    }
    if (employee && dateFrom && dateTo) {
        where = {
            AND: [
                { employeeId: Number(employee) },
                { workDate: {
                        gte: moment.utc(dateFromFiltering).toDate(),
                    }
                },
                { workDate: {
                    lte: moment.utc(dateToFiltering).toDate(),
                }
            },
            ]
        }
    }

    let getEmployee = {};
    if (employee) {
        getEmployee = await prisma.users.findFirst({
            where: {
                id: Number(employee),
            },
            select: {
                fullName: true,
                employeeId: true,
                businessUnit: {
                    select: {
                    id: true,
                    businessUnitName: true,
                    companyName: true,
                    image: true,
                    },
                },
                division: {
                    select: {
                    id: true,
                    divisionName: true,
                    },
                },
                jobTitle: {
                    select: {
                    id: true,
                    jobTitleName: true,
                    },
                },
            }
        })
    }

    const getTimeAttendance = await prisma.timeAttendance.findMany({
        where,
        select: {
            fullName: true,
            divisionName: true,
            status: true,
            workDate: true,
            checkIn: true,
            checkOut: true,
            reason: true,
        },
        orderBy: [
            {
                employeeId: 'asc',
            },
            {
                workDate: 'desc',
            }
        ],
    })

    const getDivision = await prisma.division.findMany({
        select: {
            id: true,
            divisionName: true,
        }
    })

    hash = Object.create(null),
    timeAttendaceGrouped = [];

    getTimeAttendance.forEach(function (o) {
        var key = ['divisionName'].map(function (k) { return o[k]; }).join('|');

        if (!hash[key]) {
            hash[key] = { divisionName: o.divisionName, hasEmployees : [] };
            timeAttendaceGrouped.push(hash[key]);
        }
        ['used'].forEach(function (k) { hash[key]['hasEmployees'].push({ fullName : o['fullName'], status : o['status'], workDate : o['workDate'], checkIn : o['checkIn'], checkOut : o['checkOut'], reason : o['reason'] }) });
    });

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    param = { user: userInfo, getRoles, employee, dateFrom, dateTo, moment, pageTitle : 'Time Attendance Report', getTimeAttendance: timeAttendaceGrouped, getEmployee, getDivision }
    res.render('pages/time-attendance/report-admin', param);
}

const createDataTimeAttendance = async(req, res) => {
    try {
        const { work_date, employee_id, reason } = req.body;
        let workDate = work_date.split("-")[2] + '-' + work_date.split("-")[1] + '-' + work_date.split("-")[0];
        let checkIn = workDate + ' 00:00:01';
        let checkOut = workDate + ' 00:00:01';
        const createdBy = req.user.fullName;
        const updatedBy = req.user.fullName;

        const getDataEmployee = await prisma.users.findFirst({
            where: {
                id: Number(employee_id),
            },
            select: {
                id: true,
                employeeId: true,
                fullName: true,
                businessUnit: {
                    select: {
                    id: true,
                    businessUnitName: true,
                    },
                },
                division: {
                    select: {
                    id: true,
                    divisionName: true,
                    },
                },
                jobTitle: {
                    select: {
                    id: true,
                    jobTitleName: true,
                    },
                },
            }
        })

        workDate = moment.utc(workDate).toDate()
        const isDataExist = await isExistTimeAttendanceEmployee(Number(employee_id), workDate);

        if (isDataExist) {
            req.flash('error', 'Data already exist !!!');
            res.redirect('back');
        } else {
            const inserDataAbsent = await prisma.timeAttendance.create({
                data: {
                    employeeId: Number(employee_id),
                    workDate,
                    status: 'A',
                    reason: reason,
                    checkIn: moment.utc(checkIn).toDate(),
                    checkOut: moment.utc(checkOut).toDate(),
                    fullName: getDataEmployee.fullName,
                    businessUnitId: getDataEmployee.businessUnit.id,
                    businessUnitName: getDataEmployee.businessUnit.businessUnitName,
                    divisionId: getDataEmployee.division.id,
                    divisionName: getDataEmployee.division.divisionName,
                    jobTitleId: getDataEmployee.jobTitle.id,
                    jobTitleName: getDataEmployee.jobTitle.jobTitleName,
                    createdBy,
                    updatedBy,
                }
            })
        
            if (inserDataAbsent) {
                req.flash('success', 'Sucessfully insert data');
                res.redirect('back');
            }
        }    
    } catch (err) {
        console.log(err.message);
        req.flash('error', err.message);
        res.redirect('back');
    }    
}

const updateDataTimeAttendance = async (req, res) => {
    try {
        const { ptkp_id, code, description, amount } = req.body;
        const updatedBy = req.user.fullName;
    
        const updateData = await prisma.ptkp.update({
            where: {
                id: Number(ptkp_id),
            },
            data: {
                code: code,
                description: description,
                amount: Number(amount),
                updatedBy,
            }
        })
    
        if(updateData){
            res.redirect('back');
        } else {
            req.flash('error', 'failed')
            res.redirect('back');
        }
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('back');    
    }

}

// list by employee
const listingAllDataTimeAttendance2 = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const employeeId = userInfo.id;

    const query = req.query;
    let dateFrom = query.date_from;
    let dateFromFiltering = '';
    let dateTo = query.date_to;
    let dateToFiltering = '';
    if (query.date_from)
        dateFromFiltering = dateFrom.split("-")[2] + '-' + dateFrom.split("-")[1] + '-' + dateFrom.split("-")[0];
    if (query.date_to)
        dateToFiltering = dateTo.split("-")[2] + '-' + dateTo.split("-")[1] + '-' + dateTo.split("-")[0];
    
    let where = {};
    if (dateFrom && dateTo) {
        where = {
            AND: [
                { workDate: {
                        gte: moment.utc(dateFromFiltering).toDate(),
                    }
                },
                { workDate: {
                    lte: moment.utc(dateToFiltering).toDate(),
                    }
                },
                { employeeId: employeeId }
            ]
        }
    } else {
        where = {
            employeeId: employeeId,
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.timeAttendance.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataTimeAttendance = await prisma.timeAttendance.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            employeeId: true,
            status: true,
            workDate: true,
            checkIn: true,
            checkOut: true,
            fullName: true,
            businessUnitId: true,
            businessUnitName:true,
            divisionId: true,
            divisionName: true,
            jobTitleId: true,
            jobTitleName: true,
            reason: true,
        },
        orderBy: {
            workDate: 'asc',
        }
    })

    const metaData = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfTimeAttendance = { meta : metaData, data: getDataTimeAttendance};

    const listOfEmployee = await prisma.users.findMany({
        where: {
            status: 'Active',
        },
        select: {
            id: true,
            fullName: true,
            email: true,
        }
    })

    param = { user: userInfo, getRoles, dateFrom, dateTo, moment, pageTitle : 'Time Attendance', listOfTimeAttendance, listOfEmployee }
    res.render('pages/time-attendance/index-employee', param);
}

const timeAttendanceReportByEmployee = async(req, res) => {
    const userInfo = req.user;
    const employeeId = userInfo.id;
    let query = req.query;
    let dateFrom = query.date_from;
    let dateFromFiltering = '';
    let dateTo = query.date_to;
    let dateToFiltering = '';
    if (query.date_from)
        dateFromFiltering = dateFrom.split("-")[2] + '-' + dateFrom.split("-")[1] + '-' + dateFrom.split("-")[0];
    if (query.date_to)
        dateToFiltering = dateTo.split("-")[2] + '-' + dateTo.split("-")[1] + '-' + dateTo.split("-")[0];

    let where = {};
    const getEmployee = await prisma.users.findFirst({
        where: {
            id: Number(employeeId),
        },
        select: {
            fullName: true,
            employeeId: true,
            businessUnit: {
                select: {
                  id: true,
                  businessUnitName: true,
                  companyName: true,
                  image: true,
                },
            },
            division: {
                select: {
                  id: true,
                  divisionName: true,
                },
            },
            jobTitle: {
                select: {
                  id: true,
                  jobTitleName: true,
                },
            },
        }
    })

    if (dateFrom && dateTo) {
        where = {
            AND: [
                { workDate: {
                        gte: moment.utc(dateFromFiltering).toDate(),
                    }
                },
                { workDate: {
                    lte: moment.utc(dateToFiltering).toDate(),
                }
            },
            ]
        }
    }
    const getTimeAttendance = await prisma.timeAttendance.findMany({
        where,
        select: {
            fullName: true,
            divisionName: true,
            status: true,
            workDate: true,
            checkIn: true,
            checkOut: true,
            reason: true,
        },
        orderBy: {
            workDate: 'asc'
        }
    })

    const getRoles = await listRolesPermission(userInfo.roleUuid);

    param = { user: userInfo, getRoles, employee: employeeId, dateFrom, dateTo, moment, pageTitle : 'Time Attendance Report', getTimeAttendance, getEmployee }
    res.render('pages/time-attendance/report-employee', param);
}

// Jalankan derivasi kehadiran (mode PRESENCE) untuk rentang tanggal.
// Dipakai admin untuk backfill/koreksi; cron harian memakai libs/attendance/derive langsung.
const runAttendanceDerivation = async (req, res) => {
    const { runDerivation } = require('../libs/attendance/derive');
    try {
        const dateFrom = req.body.date_from;
        const dateTo = req.body.date_to;
        if (!dateFrom || !dateTo || !moment.utc(dateFrom, 'YYYY-MM-DD', true).isValid() || !moment.utc(dateTo, 'YYYY-MM-DD', true).isValid()) {
            req.flash('error', 'Tanggal tidak valid (format YYYY-MM-DD)');
            return res.redirect('/time-attendance-admin');
        }
        const stats = await runDerivation({
            startDate: dateFrom,
            endDate: dateTo,
            actor: (req.user && req.user.fullName) || 'ADMIN-DERIVE',
        });
        req.flash('success',
            'Derivation selesai — created: ' + stats.created +
            ', updated: ' + stats.updated +
            ', skippedManual: ' + stats.skippedManual +
            ', skippedClosed: ' + stats.skippedClosed +
            ', skippedLeave: ' + stats.skippedLeave +
            (stats.warnings.length > 0 ? ', warnings: ' + stats.warnings.slice(0, 5).join('; ') : ''));
        return res.redirect('/time-attendance-admin?date_from=' + encodeURIComponent(dateFrom) + '&date_to=' + encodeURIComponent(dateTo));
    } catch (err) {
        req.flash('error', err.message);
        return res.redirect('/time-attendance-admin');
    }
};

module.exports = {
    listingAllDataTimeAttendance,
    runAttendanceDerivation,
    timeAttendanceReportByAdmin,
    createDataTimeAttendance,
    updateDataTimeAttendance,
    listingAllDataTimeAttendance2,
    timeAttendanceReportByEmployee,
}