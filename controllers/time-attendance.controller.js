const prisma = require('../libs/prisma');
const logger = require('../libs/logger');
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
        logger.error(err.message);
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

// ======================= FASE 3: IMPORT CSV & REKAP =======================

// Import CSV/Excel-CSV dari mesin absensi: auto-detect format, pairing
// punch min/max per hari, tulis baris dengan punch, lalu auto-derive.
const importAttendanceCsv = async (req, res) => {
    try {
        if (!req.files || !req.files.csv_file) {
            req.flash('error', 'Pilih file CSV terlebih dahulu');
            return res.redirect('/time-attendance-admin');
        }
        const file = req.files.csv_file;
        const { parseAttendanceCsv, minutesToTimeDate } = require('../libs/attendance/import-csv');
        const parsed = parseAttendanceCsv(file.data.toString('utf8'));

        // Map User ID mesin -> user (employeeId unik)
        const empIds = [...new Set(parsed.paired.map((p) => p.employeeIdRaw))];
        const users = await prisma.users.findMany({
            where: { employeeId: { in: empIds.map((e) => { const n = BigInt(e); return n; }) } },
            select: { id: true, employeeId: true, fullName: true, businessUnitId: true, businessUnit: { select: { businessUnitName: true } }, divisionId: true, division: { select: { divisionName: true } }, jobTitleId: true, jobTitle: { select: { jobTitleName: true } } },
        });
        const userByEmp = new Map(users.map((u) => [String(u.employeeId), u]));

        const warnings = parsed.warnings.slice();
        let created = 0, updated = 0, skippedManual = 0, unknownUsers = new Set();
        for (const p of parsed.paired) {
            const user = userByEmp.get(p.employeeIdRaw);
            if (!user) { unknownUsers.add(p.employeeIdRaw); continue; }
            const workDate = new Date(p.dateKey + 'T00:00:00.000Z');
            const existing = await prisma.timeAttendance.findFirst({
                where: { employeeId: user.id, workDate },
            });
            const hasPunch = Boolean(existing && (existing.checkIn || existing.checkOut));
            if (existing && !hasPunch && existing.isDerived === 0) { skippedManual += 1; continue; }
            const data = {
                checkIn: p.checkIn ? minutesToTimeDate(parseHm(p.checkIn)) : null,
                checkOut: p.checkOut ? minutesToTimeDate(parseHm(p.checkOut)) : null,
                status: hasPunch ? (existing.status || 'P') : 'P', // diberi stamp oleh derivasi setelah ini
                updatedBy: 'CSV-IMPORT',
            };
            if (existing) {
                await prisma.timeAttendance.update({ where: { id: existing.id }, data });
                updated += 1;
            } else {
                await prisma.timeAttendance.create({ data: {
                    createdBy: 'CSV-IMPORT', updatedBy: 'CSV-IMPORT',
                    employeeId: user.id, fullName: user.fullName,
                    businessUnitId: user.businessUnitId, businessUnitName: user.businessUnit ? user.businessUnit.businessUnitName : null,
                    divisionId: user.divisionId, divisionName: user.division ? user.division.divisionName : null,
                    jobTitleId: user.jobTitleId, jobTitleName: user.jobTitle ? user.jobTitle.jobTitleName : null,
                    workDate,
                    checkIn: data.checkIn, checkOut: data.checkOut,
                    status: 'P', isDerived: 1,
                }});
                created += 1;
            }
        }
        if (unknownUsers.size > 0) warnings.push('User ID tidak dikenal (dilewati): ' + [...unknownUsers].join(', '));

        // Auto-derive untuk seluruh rentang tanggal hasil import
        const dates = parsed.paired.map((p) => p.dateKey).sort();
        let derived = null;
        if (dates.length > 0) {
            const { runDerivation } = require('../libs/attendance/derive');
            derived = await runDerivation({ startDate: dates[0], endDate: dates[dates.length - 1], actor: 'CSV-IMPORT' });
        }

        req.flash('success',
            'Import CSV (' + parsed.format + ', pemisah "' + parsed.separator + '") — punch: ' + parsed.punches.length +
            ', hari/karyawan: ' + parsed.paired.length +
            ', baris dibuat: ' + created + ', di-update: ' + updated +
            ', manual dilewati: ' + skippedManual +
            (parsed.skipped.length > 0 ? ', baris rusak: ' + parsed.skipped.length : '') +
            (derived ? ', derivasi (A/L/M/P): created ' + derived.created + ', updated ' + derived.updated : '') +
            (warnings.length > 0 ? ' || ' + warnings.slice(0, 4).join(' ; ') : ''));
    } catch (err) {
        req.flash('error', 'Import gagal: ' + err.message);
    }
    return res.redirect('/time-attendance-admin');
}

/** '08:05' -> 485 menit */
function parseHm(hm) {
    const m = String(hm).match(/^(\d{1,2}):(\d{2})$/);
    return Number(m[1]) * 60 + Number(m[2]);
}

// Rekap kehadiran per divisi (agregasi dari timeAttendance).
async function buildRecap(dateFrom, dateTo, businessUnitId) {
    const where = { workDate: { gte: new Date(dateFrom + 'T00:00:00.000Z'), lte: new Date(dateTo + 'T00:00:00.000Z') } };
    if (businessUnitId) where.businessUnitId = Number(businessUnitId);
    const rows = await prisma.timeAttendance.findMany({
        where,
        select: { employeeId: true, fullName: true, divisionId: true, divisionName: true, status: true, lateMinutes: true, earlyOutMinutes: true },
        orderBy: [{ divisionId: 'asc' }, { fullName: 'asc' }],
    });
    // status cuti tetap di requestLeave (baris 'S'/'N'/'U' lama berbasis baris);
    // rekap menghitung dari TimeAttendance agar konsisten dengan payroll.
    const byEmp = new Map();
    for (const r of rows) {
        if (!byEmp.has(r.employeeId)) {
            byEmp.set(r.employeeId, {
                employeeId: r.employeeId, fullName: r.fullName, divisionId: r.divisionId, divisionName: r.divisionName || '-',
                present: 0, late: 0, lateMinutes: 0, absent: 0, missing: 0, other: {},
            });
        }
        const e = byEmp.get(r.employeeId);
        if (r.status === 'P') e.present += 1;
        else if (r.status === 'L') { e.late += 1; e.lateMinutes += r.lateMinutes || 0; }
        else if (r.status === 'A') e.absent += 1;
        else if (r.status === 'M') e.missing += 1;
        else e.other[r.status] = (e.other[r.status] || 0) + 1;
    }
    const employees = [...byEmp.values()].map((e) => {
        const days = e.present + e.late + e.absent + e.missing + Object.values(e.other).reduce((a, b) => a + b, 0);
        e.days = days;
        e.attendancePct = days > 0 ? Math.round(((e.present + e.late) / days) * 100) : 0;
        return e;
    });
    const byDivision = new Map();
    for (const e of employees) {
        if (!byDivision.has(e.divisionId)) byDivision.set(e.divisionId, { divisionName: e.divisionName, employees: [] });
        byDivision.get(e.divisionId).employees.push(e);
    }
    return [...byDivision.values()];
}

const timeAttendanceRecap = async (req, res) => {
    const query = req.query;
    const dateFrom = query.date_from || moment.utc().startOf('month').format('YYYY-MM-DD');
    const dateTo = query.date_to || moment.utc().format('YYYY-MM-DD');
    const businessUnitId = query.business_unit || null;

    const divisions = await buildRecap(dateFrom, dateTo, businessUnitId);
    const listOfBU = await prisma.businessUnit.findMany({ select: { id: true, businessUnitName: true }, orderBy: { businessUnitName: 'asc' } });
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/time-attendance/recap-admin', {
        user: userInfo, getRoles, pageTitle: 'Attendance Recap',
        dateFrom, dateTo, businessUnitId, listOfBU, divisions, moment,
    });
}

const timeAttendanceRecapCsv = async (req, res) => {
    const { csvField } = require('../libs/payroll/payment-file');
    const query = req.query;
    const dateFrom = query.date_from || moment.utc().startOf('month').format('YYYY-MM-DD');
    const dateTo = query.date_to || moment.utc().format('YYYY-MM-DD');
    const divisions = await buildRecap(dateFrom, dateTo, query.business_unit || null);

    const lines = ['Divisi,Nama,Hari Terdata,Hadir,Telat,Total Menit Telat,Absent,Missing Out,Lainnya,% Hadir'];
    for (const div of divisions) {
        for (const e of div.employees) {
            const other = Object.entries(e.other).map(([k, v]) => k + '=' + v).join(' ') || '-';
            lines.push([
                csvField(div.divisionName), csvField(e.fullName), e.days, e.present, e.late,
                e.lateMinutes, e.absent, e.missing, csvField(other), e.attendancePct + '%',
            ].join(','));
        }
    }
    const filename = 'recap-kehadiran-' + dateFrom + '_' + dateTo + '.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    return res.send('\uFEFF' + lines.join('\r\n'));
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
    importAttendanceCsv,
    timeAttendanceRecap,
    timeAttendanceRecapCsv,
    timeAttendanceReportByAdmin,
    createDataTimeAttendance,
    updateDataTimeAttendance,
    listingAllDataTimeAttendance2,
    timeAttendanceReportByEmployee,
}