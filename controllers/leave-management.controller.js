var logger = require('../libs/logger'),
    csrf = require('../libs/csrf'),
    csrfProtection = csrf({
      cookie: true
    });
var flash = require('connect-flash');

const prisma = require('../libs/prisma');

const moment = require('moment');
const { listRolesPermission } = require('../helper/roles-permission');
const { isExistTimeAttendanceEmployee } = require('../helper/general');

const showConfigureAnnualLeave = async (req, res) => {
    const getAnnualLeaveData = await prisma.setupAnnualLeave.findUnique({
        where: {
            name: 'init'
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/annual-leave', { user: userInfo, getRoles, pageTitle: 'Configure Annual Leave', getAnnualLeaveData });
}

const updateConfigureAnnualLeave = async (req, res) => {
    const { uuid, time_off_per_month, additional_time_off } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    if(uuid){
        const updateAnnualLeaveData = await prisma.setupAnnualLeave.update({
            where: {
                uuid: uuid
            },
            data: {
                timeOffPerMonth: parseInt(time_off_per_month),
                additionalTimeOff: parseInt(additional_time_off),
                updatedBy
            }
        })    
    } else {
        const insertAnnualLeaveData = await prisma.setupAnnualLeave.create({
            data: {
                timeOffPerMonth: parseInt(time_off_per_month),
                additionalTimeOff: parseInt(additional_time_off),
                createdBy,
                updatedBy
            }
        })
    }

    req.flash('success', 'Configure annual leave success !!');
    res.redirect('back');
}

const showConfigureSickLeave = async (req, res) => {
    const getSickLeaveData = await prisma.setupSickLeave.findUnique({
        where: {
            name: 'init'
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/sick-leave', { user: userInfo, getRoles, pageTitle: 'Configure Sick Leave', getSickLeaveData });
}

const updateConfigureSickLeave = async (req, res) => {
    const { uuid, day, day_old } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    if(uuid){
        const updateSetupSickLeave = await prisma.setupSickLeave.update({
            where: {
                uuid: uuid
            },
            data: {
                day: parseInt(day),
                updatedBy
            }
        })    

        if (day > day_old) {
            const differenceDay = day - day_old;
            const result = await prisma.$executeRaw`UPDATE users SET sickLeaveBalance = sickLeaveBalance + ${differenceDay};`
        }
    } else {
        const insertSickLeave = await prisma.setupSickLeave.create({
            data: {
                day: parseInt(day),
                createdBy,
                updatedBy
            }
        })
    }

    req.flash('success', 'Configure sick leave successfully !!');
    res.redirect('back');
}

const getRequestLeaveByUuid = async (req, res) => {
    const uuid = req.params.uuid;
    const getRequestAnnualLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, leaveType, leaveTypeDescription, businessUnitName, jobTitleName, divisionName, isApproved, approvedDate, commentsBySupervisor, requestLeave.image, isApprovedByHR, approvedDateByHR, commentsByHR FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE requestLeave.uuid = ${uuid};`

    if(getRequestAnnualLeave === undefined ||  getRequestAnnualLeave.length == 0) {
        res.status(404).send({
            status: true,
            statusCode: 404,
            message: 'Get data detail unsuccessfully',
            data: getRequestAnnualLeave
        });    
    } else {
        res.status(200).send({
            status: true,
            statusCode: 200,
            message: 'Get data detail successfully',
            data: getRequestAnnualLeave
        });    
    }
}

const approvedRequestAnnualLeaveBySupervisor = async (req, res) => {
    const leaveType =  1; //'Annual Leave';
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id};`
    let getRequestAnnualLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} LIMIT ${limit};`
    if (skip > 0)
        getRequestAnnualLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} LIMIT ${skip}, ${limit};`
    
    if (search) {
        let searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND fullName LIKE ${searching};`
        getRequestAnnualLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getRequestAnnualLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
    }
    
    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalRecords % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRequestAnnualLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRequestAnnualLeave = { meta : metaDataRequestAnnualLeave, data: getRequestAnnualLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/approved-annual-leave-by-supervisor', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Annual Leave By Supervisor', listOfRequestAnnualLeave: listOfRequestAnnualLeave})
}

const processApprovedRequestAnnualLeaveBySupervisor = async (req, res) => {
    const { uuid, is_approved, comments, days, employee_id } = req.body;
    let approved_date = moment.utc().format('DD-MM-yyyy');
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
    const approvedBy = req.user.fullName;

    if (is_approved == 1) {
        const getAnnualLeaveBalance = await prisma.users.findFirst({
            where: {
                id: Number(employee_id),
            },
            select: {
                annualLeave: true,
                annualLeaveBalance: true,
            }
        })

        if (Number(getAnnualLeaveBalance.annualLeaveBalance) >= Number(days)) {
            const getDataRequestAnnualLeave = await prisma.requestLeave.findFirst({
                where: {
                    uuid: uuid,
                },
                select: {
                    startDuration: true,
                    endDuration: true,
                }
            })
            let startDuration = moment(getDataRequestAnnualLeave.startDuration);
            let endDuration = moment(getDataRequestAnnualLeave.endDuration);
            let daysOfAnnualLeave = moment.duration(endDuration.diff(startDuration)).asDays() + 1;
            let workDate = moment(startDuration, "DD-MM-YYYY").add(1, 'days');
        
            const getSetupWorkDays = await prisma.setupSystem.findFirst({
                select: {
                    workDays: true,
                }
            })
        
            let workDays = 5;
            if (getSetupWorkDays)
                workDays = getSetupWorkDays.workDays;

            let isDataExist = false;
            let isExistTimeAttendance = false;
            for (let index = 0; index < daysOfAnnualLeave; index++) {
                workDate = moment(startDuration, "DD-MM-YYYY").add(index, 'days');
                let dayOfWorkDate = moment.utc(workDate).format('dddd');
                isDataExist = await isExistTimeAttendanceEmployee(Number(employee_id), workDate);
                if (workDays == 5) {
                    if (dayOfWorkDate == 'Saturday' || dayOfWorkDate == 'Sunday') {
                    } else {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            if (isDataExist == true)
                                isExistTimeAttendance = true;
                        }
                    }
                } else {
                    if (dayOfWorkDate != 'Sunday') {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            if (isDataExist == true)
                                isExistTimeAttendance = true;
                        }
                    }
                }                
            }

            if (Boolean(isExistTimeAttendance)) {
                req.flash('uuid', uuid);
                req.flash('error', 'The Data of time attendance already exist !!!');
                res.redirect('back');
                return 'data exists';
            }

            const updateRequestAnnualLeave = await prisma.requestLeave.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    isApproved: Number(is_approved),
                    approvedDate: moment.utc(approvedDate).toDate(),
                    approvedBy,     
                    commentsBySupervisor: comments,           
                }
            })

            req.flash('success', 'Approve annual leave by HR successfully !!');
            res.redirect('back');
        } else {
            req.flash('uuid', uuid);
            req.flash('error', 'Balance annual leave is not enough, this employee only have ' + getAnnualLeaveBalance.annualLeaveBalance + ' days remaining!!');
            res.redirect('back');
        }
    } else if (is_approved == 2) {
        const updateRequestAnnualLeave = await prisma.requestLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApproved: Number(is_approved),
                approvedDate: moment.utc(approvedDate).toDate(),
                approvedBy,     
                commentsBySupervisor: comments,    
            }
        })

        req.flash('success', 'Denied annual leave successfully !!');
        res.redirect('back');
    }
}

const approvedRequestAnnualLeaveByHR = async (req, res) => {
    const leaveType =  1; //'Annual Leave';
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType};`
    let getRequestAnnualLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, commentsBySupervisor FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} LIMIT ${limit};`
    if (skip > 0)
        getRequestAnnualLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, commentsBySupervisor FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} LIMIT ${skip}, ${limit};`
    
    if (search) {
        searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} AND fullName LIKE ${searching};`
        getRequestAnnualLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, commentsBySupervisor FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getRequestAnnualLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, commentsBySupervisor FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
    }
    
    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalRecords % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRequestAnnualLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRequestAnnualLeave = { meta : metaDataRequestAnnualLeave, data: getRequestAnnualLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/approved-annual-leave-by-hr', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Annual Leave By HR', listOfRequestAnnualLeave: listOfRequestAnnualLeave})
}

const processApprovedRequestAnnualLeaveByHR = async (req, res) => {
    const { uuid, is_approved, comments, days, employee_id } = req.body;
    let approved_date = moment.utc().format('DD-MM-yyyy');
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
    const approvedBy = req.user.fullName;

    if (is_approved == 1) {
        const getAnnualLeaveBalance = await prisma.users.findFirst({
            where: {
                id: Number(employee_id),
            },
            select: {
                annualLeave: true,
                annualLeaveBalance: true,
            }
        })

        if (Number(getAnnualLeaveBalance.annualLeaveBalance) >= Number(days)) {
            console.log('appr1')
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
        
            const getDataRequestAnnualLeave = await prisma.requestLeave.findFirst({
                where: {
                    uuid: uuid,
                },
                select: {
                    startDuration: true,
                    endDuration: true,
                }
            })
            let startDuration = moment(getDataRequestAnnualLeave.startDuration);
            let endDuration = moment(getDataRequestAnnualLeave.endDuration);
            let daysOfAnnualLeave = moment.duration(endDuration.diff(startDuration)).asDays() + 1;
            let workDate = moment(startDuration, "DD-MM-YYYY").add(1, 'days');
        
            const getSetupWorkDays = await prisma.setupSystem.findFirst({
                select: {
                    workDays: true,
                }
            })
        
            let workDays = 5;
            if (getSetupWorkDays)
                workDays = getSetupWorkDays.workDays;

            let isDataExist = false;
            let isExistTimeAttendance = false;
            console.log(daysOfAnnualLeave);
            for (let index = 0; index < daysOfAnnualLeave; index++) {
                workDate = moment(startDuration, "DD-MM-YYYY").add(index, 'days');
                let dayOfWorkDate = moment.utc(workDate).format('dddd');
                isDataExist = await isExistTimeAttendanceEmployee(Number(employee_id), workDate);
                if (workDays == 5) {
                    if (dayOfWorkDate == 'Saturday' || dayOfWorkDate == 'Sunday') {
                    } else {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            if (isDataExist == true)
                                isExistTimeAttendance = true;
                        }
                    }
                } else {
                    if (dayOfWorkDate != 'Sunday') {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            if (isDataExist == true)
                                isExistTimeAttendance = true;
                        }
                    }
                }                
            }

            if (Boolean(isExistTimeAttendance)) {
                req.flash('uuid', uuid);
                req.flash('error', 'The Data of time attendance already exist !!!');
                res.redirect('back');
                return 'data exists';
            }

            for (let index = 0; index < daysOfAnnualLeave; index++) {
                console.log('appr time attnd')

                workDate = moment(startDuration, "DD-MM-YYYY").add(index, 'days');
                let checkIn = moment.utc(workDate).format('YYYY-MM-DD') + ' 00:00:01';
                let checkOut = moment.utc(workDate).format('YYYY-MM-DD') + ' 00:00:01';
                let dayOfWorkDate = moment.utc(workDate).format('dddd');
        
                if (workDays == 5) {
                    if (dayOfWorkDate == 'Saturday' || dayOfWorkDate == 'Sunday') {
                    } else {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        
                        if (getCalendar == null) {
                            const inserData = await prisma.timeAttendance.create({
                                data: {
                                    employeeId: Number(employee_id),
                                    workDate: moment.utc(workDate).toDate(),
                                    status: 'N', //annual leave
                                    reason: 'Annual Leave',
                                    checkIn: moment.utc(checkIn).toDate(),
                                    checkOut: moment.utc(checkOut).toDate(),
                                    fullName: getDataEmployee.fullName,
                                    businessUnitId: getDataEmployee.businessUnit.id,
                                    businessUnitName: getDataEmployee.businessUnit.businessUnitName,
                                    divisionId: getDataEmployee.division.id,
                                    divisionName: getDataEmployee.division.divisionName,
                                    jobTitleId: getDataEmployee.jobTitle.id,
                                    jobTitleName: getDataEmployee.jobTitle.jobTitleName,
                                    createdBy: approvedBy,
                                    updatedBy: approvedBy,
                                }
                            })
                        }
                    }
                } else {
                    if (dayOfWorkDate != 'Sunday') {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            const inserData = await prisma.timeAttendance.create({
                                data: {
                                    employeeId: Number(employee_id),
                                    workDate: moment.utc(workDate).toDate(),
                                    status: 'N', //annual leave
                                    reason: 'Annual Leave',
                                    checkIn: moment.utc(checkIn).toDate(),
                                    checkOut: moment.utc(checkOut).toDate(),
                                    fullName: getDataEmployee.fullName,
                                    businessUnitId: getDataEmployee.businessUnit.id,
                                    businessUnitName: getDataEmployee.businessUnit.businessUnitName,
                                    divisionId: getDataEmployee.division.id,
                                    divisionName: getDataEmployee.division.divisionName,
                                    jobTitleId: getDataEmployee.jobTitle.id,
                                    jobTitleName: getDataEmployee.jobTitle.jobTitleName,
                                    createdBy: approvedBy,
                                    updatedBy: approvedBy,
                                }
                            })
                        }
                    }
                }
            }        

            const updateUserAnnualLeaveBalance = await prisma.$executeRaw`UPDATE users SET annualLeave = annualLeave + ${Number(days)}, annualLeaveBalance = annualLeaveBalance - ${Number(days)} WHERE id= ${employee_id};`
            const updateRequestAnnualLeave = await prisma.requestLeave.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    isApprovedByHR: Number(is_approved),
                    approvedDateByHR: moment.utc(approvedDate).toDate(),
                    approvedHRBy: approvedBy,     
                    commentsByHR: comments,    
                }
            })

            req.flash('success', 'Approve annual leave by HR successfully !!');
            res.redirect('back');
        } else {
            req.flash('uuid', uuid);
            req.flash('error', 'Balance annual leave is not enough, this employee only have ' + getAnnualLeaveBalance.annualLeaveBalance + ' days remaining!!');
            res.redirect('back');
        }
    } else if (is_approved == 2) {
        const updateRequestAnnualLeave = await prisma.requestLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApprovedByHR: Number(is_approved),
                approvedDateByHR: moment.utc(approvedDate).toDate(),
                approvedHRBy: approvedBy,     
                commentsByHR: comments,                           
            }
        })

        req.flash('success', 'Denied annual leave by HR successfully !!');
        res.redirect('back');
    }
}

const approvedRequestSickLeaveBySupervisor = async (req, res) => {
    const leaveType =  2; //'Sick Leave';
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved = 0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id};`
    let getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} LIMIT ${limit};`
    if (skip > 0)
        getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} LIMIT ${skip}, ${limit};`

    if (search) {
        let searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
    }

    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalRecords % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRequestSickLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRequestSickLeave = { meta : metaDataRequestSickLeave, data: getRequestSickLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/approved-sick-leave-by-supervisor', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Sick Leave', listOfRequestSickLeave: listOfRequestSickLeave})
}

const processApprovedRequestSickLeaveBySupervisor = async (req, res) => {
    const { uuid, is_approved, comments, days, employee_id, work_date } = req.body;
    let approved_date = moment.utc().format('DD-MM-yyyy');
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
    const approvedBy = req.user.fullName;

    if (is_approved == 1){
        const getSickLeaveBalance = await prisma.users.findFirst({
            where: {
                id: Number(employee_id),
            },
            select: {
                sickLeave: true,
                sickLeaveBalance: true,
            }
        })

        if (Number(getSickLeaveBalance.sickLeaveBalance) >= Number(days)) {
            let workDate = work_date.split("-")[2] + '-' + work_date.split("-")[1] + '-' + work_date.split("-")[0];
            let isDataExist = await isExistTimeAttendanceEmployee(Number(employee_id), workDate);            
            if (isDataExist == true) {
                req.flash('uuid', uuid);
                req.flash('error', 'The Data of time attendance is already exist !!');
                res.redirect('back');
                return 'already exist';
            }

            const updateRequestSickLeave = await prisma.requestLeave.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    isApproved: Number(is_approved),
                    approvedDate: moment.utc(approvedDate).toDate(),
                    approvedBy,     
                    commentsBySupervisor: comments,           
                }
            })
            
            req.flash('success', 'Approve sick leave by supervisor successfully !!');
            res.redirect('back');
        } else {
            req.flash('uuid', uuid);
            //req.flash('approvedDate', approvedDateDDMMYY);
            req.flash('error', 'Balance of sick leave is not enough !!');
            res.redirect('back');
        }
    } else if (is_approved == 2) {
        const updateRequestSickLeave = await prisma.requestLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApproved: Number(is_approved),
                approvedDate: moment.utc(approvedDate).toDate(),
                approvedBy,     
                commentsBySupervisor: comments,           
            }
        })

        req.flash('success', 'Denied sick leave by supervisor successfully !!');
        res.redirect('back');
    }
}

const approvedRequestSickLeaveByHR = async (req, res) => {
    const leaveType =  2; //'Sick Leave';
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType};`
    let getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} LIMIT ${limit};`
    if (skip > 0)
        getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} LIMIT ${skip}, ${limit};`

    if (search) {
        let searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
    }

    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalRecords % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRequestSickLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRequestSickLeave = { meta : metaDataRequestSickLeave, data: getRequestSickLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/approved-sick-leave-by-hr', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Sick Leave By HR', listOfRequestSickLeave: listOfRequestSickLeave})
}

const processApprovedRequestSickLeaveByHR = async (req, res) => {
    const { uuid, is_approved, comments, days, employee_id, work_date } = req.body;
    console.log(work_date);

    let approved_date = moment.utc().format('DD-MM-yyyy');
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
    const approvedBy = req.user.fullName;

    if (is_approved == 1){
        const getSickLeaveBalance = await prisma.users.findFirst({
            where: {
                id: Number(employee_id),
            },
            select: {
                sickLeave: true,
                sickLeaveBalance: true,
            }
        })

        if (Number(getSickLeaveBalance.sickLeaveBalance) >= Number(days)) {
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

            let workDate = work_date.split("-")[2] + '-' + work_date.split("-")[1] + '-' + work_date.split("-")[0];
            let checkIn = moment.utc(workDate).format('YYYY-MM-DD') + ' 00:00:01';
            let checkOut = moment.utc(workDate).format('YYYY-MM-DD') + ' 00:00:01';

            let isDataExist = await isExistTimeAttendanceEmployee(Number(employee_id), workDate);            
            if (isDataExist == true) {
                req.flash('uuid', uuid);
                req.flash('error', 'The Data of time attendance is already exist !!');
                res.redirect('back');
                return 'already exist';
            }

            const inserDataTimeAttendance = await prisma.timeAttendance.create({
                data: {
                    employeeId: Number(employee_id),
                    workDate: moment.utc(workDate).toDate(),
                    status: 'S', //sick leave
                    reason: 'Sick Leave',
                    checkIn: moment.utc(checkIn).toDate(),
                    checkOut: moment.utc(checkOut).toDate(),
                    fullName: getDataEmployee.fullName,
                    businessUnitId: getDataEmployee.businessUnit.id,
                    businessUnitName: getDataEmployee.businessUnit.businessUnitName,
                    divisionId: getDataEmployee.division.id,
                    divisionName: getDataEmployee.division.divisionName,
                    jobTitleId: getDataEmployee.jobTitle.id,
                    jobTitleName: getDataEmployee.jobTitle.jobTitleName,
                    createdBy: approvedBy,
                    updatedBy: approvedBy,
                }
            })

            const updateUserSickLeaveBalance = await prisma.$executeRaw`UPDATE users SET sickLeave = sickLeave + ${Number(days)}, sickLeaveBalance = sickLeaveBalance - ${Number(days)} WHERE id= ${employee_id};`
            const updateRequestSickLeave = await prisma.requestLeave.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    isApprovedByHR: Number(is_approved),
                    approvedDateByHR: moment.utc(approvedDate).toDate(),
                    approvedHRBy: approvedBy,     
                    commentsByHR: comments,           
                }
            })
            
            req.flash('success', 'Approve sick leave by HR successfully !!');
            res.redirect('back');
        } else {
            req.flash('uuid', uuid);
            //req.flash('approvedDate', approvedDateDDMMYY);
            req.flash('error', 'Balance of sick leave is not enough !!');
            res.redirect('back');
        }
    } else if (is_approved == 2) {
        const updateRequestSickLeave = await prisma.requestLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApprovedByHR: Number(is_approved),
                approvedDateByHR: moment.utc(approvedDate).toDate(),
                approvedHRBy: approvedBy,     
                commentsByHR: comments,           
            }
        })

        req.flash('success', 'Denied sick leave by HR successfully !!');
        res.redirect('back');
    }
}

const calculateAnnualLeave = async (req, res) => {
    let createdBy = req.user.fullName;
    let updatedBy = req.user.fullName;

    const getSetupAnnualLeave = await prisma.setupAnnualLeave.findFirst({
        select: {
            timeOffPerYear: true,
            timeOffPerMonth: true,
            additionalTimeOff: true,
            defaultCalculation: true,
        }
    })

    let timeOf = 1;
    let additionalTimeOff = 0;
    if (getSetupAnnualLeave) {
        if (getSetupAnnualLeave.defaultCalculation == 'Monthly') {
            timeOf = getSetupAnnualLeave.timeOffPerMonth;
            additionalTimeOff = getSetupAnnualLeave.additionalTimeOff;    
        } else {
            timeOf = getSetupAnnualLeave.timeOffPerYear;
            additionalTimeOff = getSetupAnnualLeave.additionalTimeOff;    
        }
    }

    const getEmployee = await prisma.users.findMany({
        where: {
            AND: [
                //{ roleId: 1},
                { employmentStatus: 'Permanent' },
                { status: 'Active' },    
            ]
        }
    })

    const getCurrentMonth = moment().format('M');
    const getCurrentYear = moment().format('Y');
    let monthOfJoinDate;
    let annualLeave;
    for (let index = 0; index < getEmployee.length; ++index) {
        const employee = getEmployee[index];
        monthOfJoinDate = moment(employee.joinDate).format('M');
        if (monthOfJoinDate == getCurrentMonth) {
            annualLeave = Number(timeOf) + Number(additionalTimeOff);
        } else {
            annualLeave = Number(timeOf);
        }

        const isExistEmployeeAnnualLeave = await prisma.employeeAnnualLeave.findFirst({
            where: {
                employeeId: Number(employee.id),
                Period: Number(getCurrentMonth),
            },
            select: {
                id: true,
            }
        })

        if (!isExistEmployeeAnnualLeave) {
            const insertEmployeeAnnualLeave = await prisma.employeeAnnualLeave.create({
                data: {
                    employeeId: Number(employee.id),
                    Period: Number(getCurrentMonth),
                    day: annualLeave,
                    year: Number(getCurrentYear),
                    createdBy,
                    updatedBy,
                }
            })    
        }

        const updateEmploymentStatus = await prisma.users.update({
            where : {
                uuid: employee.uuid,
            },
            data: {
                annualLeaveBalance: annualLeave,
            }
        })    
    }
    res.status(200).send({
        status: true,
        statusCode: 200,
        message: 'Calculate annual leave successfully',
        data: []
    });  
}

const calculateSickLeave = async (req, res) => {
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const getSetupSickLeave = await prisma.setupSickLeave.findFirst({
        where: {
            name: 'init',
        },
        select: {
            day: true,
        }
    })

    let dayOfSickLeave = 2;
    if (getSetupSickLeave) {
        dayOfSickLeave = getSetupSickLeave.day;
    }

    const getEmployee = await prisma.users.findMany({
        where: {
            AND: [
                //{ roleId: 1},
                { employmentStatus: 'Permanent' },
                { status: 'Active' },    
            ]
        }
    })

    const getCurrentMonth = moment().format('M');
    for (let index = 0; index < getEmployee.length; ++index) {
        const employee = getEmployee[index];

        const isExistEmployeeSickLeave = await prisma.employeeSickLeave.findFirst({
            where: {
                employeeId: Number(employee.id),
                Period: Number(getCurrentMonth),
            },
            select: {
                id: true,
            }
        })

        if (!isExistEmployeeSickLeave) {
            const insertEmployeeSickLeave = await prisma.employeeSickLeave.create({
                data: {
                    employeeId: Number(employee.id),
                    Period: Number(getCurrentMonth),
                    year: Number(getCurrentYear),
                    day: dayOfSickLeave,
                    createdBy: createdBy,
                    updatedBy: updatedBy,
                }
            })    
        }

        const updateEmployeeSickLeave = await prisma.users.update({
            where: {
                uuid: employee.uuid,
            },
            data: {
                sickLeaveBalance: dayOfSickLeave,
            }
        }) 
    }
    res.status(200).send({
        status: true,
        statusCode: 200,
        message: 'Calculate sick leave successfully',
        data: []
    });    
}

const approvedRequestSickLeave2BySupervisor  = async (req, res) => {
    const leaveType =  3; //'Sick Leave 2';
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved = 0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id};`
    let getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, requestLeave.image FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved = 0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id};`
    if (skip > 0)
        getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, requestLeave.image FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved = 0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} LIMIT ${skip}, ${limit};`

    if (search) {
        searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${search} OR divisionName LIKE ${search} OR leaveDescription LIKE ${searching});`
        getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, requestLeave.image FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved = 0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR divisionName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, requestLeave.image FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved = 0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR divisionName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
    }

    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalRecords % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRequestSickLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRequestSickLeave = { meta : metaDataRequestSickLeave, data: getRequestSickLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/approved-sick-leave2-by-supervisor', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Sick Leave 2 by Supervisor', listOfRequestSickLeave: listOfRequestSickLeave})
}

const processApprovedRequestSickLeave2BySupervisor = async (req, res) => {
    try {
        const { uuid, is_approved, comments, employee_id } = req.body;
        let approved_date = moment().format('DD-MM-yyyy');
        let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
        const approvedBy = req.user.fullName;

        if (is_approved == 1) {
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

            const getDataRequestSickLeave2 = await prisma.requestLeave.findFirst({
                where: {
                    uuid: uuid,
                },
                select: {
                    startDuration: true,
                    endDuration: true,
                }
            })

            let startDuration = moment(getDataRequestSickLeave2.startDuration);
            let endDuration = moment(getDataRequestSickLeave2.endDuration);
            let daysOfSickLeave2 = moment.duration(endDuration.diff(startDuration)).asDays() + 1;
            let workDate = moment(startDuration, "DD-MM-YYYY").add(1, 'days');

            const getSetupWorkDays = await prisma.setupSystem.findFirst({
                select: {
                    workDays: true,
                }
            })

            let workDays = 5;
            if (getSetupWorkDays)
                workDays = getSetupWorkDays.workDays;

            let isDataExist = false;
            let isExistTimeAttendance = false;
            for (let index = 0; index < daysOfSickLeave2; index++) {
                workDate = moment(startDuration, "DD-MM-YYYY").add(index, 'days');
                let dayOfWorkDate = moment.utc(workDate).format('dddd');
                isDataExist = await isExistTimeAttendanceEmployee(Number(employee_id), workDate);
                if (workDays == 5) {
                    if (dayOfWorkDate == 'Saturday' || dayOfWorkDate == 'Sunday') {
                    } else {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            if (isDataExist == true)
                                isExistTimeAttendance = true;
                        }
                    }
                } else {
                    if (dayOfWorkDate != 'Sunday') {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            if (isDataExist == true)
                                isExistTimeAttendance = true;
                        }
                    }
                }                
            }
            
            if (Boolean(isExistTimeAttendance)) {
                console.log('sukses')
                req.flash('uuid', uuid);
                req.flash('error', 'The Data of time attendance already exist !!!');
                res.redirect('back');
                return 'data exists';
            }
            
            const updateRequestSickLeave2 = await prisma.requestLeave.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    isApproved: Number(is_approved),
                    approvedDate: moment.utc(approvedDate).toDate(),
                    approvedBy,     
                    commentsBySupervisor: comments,           
                }
            })

            req.flash('success', 'Approve sick leave 2 by supervisor successfully !!');
            res.redirect('back');
        } else if (is_approved == 2) {
            const updateRequestSickLeave = await prisma.requestLeave.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    isApproved: Number(is_approved),
                    approvedDate: moment.utc(approvedDate).toDate(),
                    approvedBy,     
                    commentsBySupervisor: comments,           
                }
            })

            req.flash('success', 'Denied sick leave 2 by supervisor successfully !!');
            res.redirect('back');
        }
    } catch (err) {
        console.log(err.message);
        req.flash('error', err.message);
        res.redirect('back');
    }
}

const approvedRequestSickLeave2ByHR = async (req, res) => {
    const leaveType =  3; //'Sick Leave 2';
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 and isApprovedByHR=0 AND leaveType = ${leaveType};`
    let getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, requestLeave.image FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 and isApprovedByHR=0 AND leaveType = ${leaveType};`
    if (skip > 0)
        getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, requestLeave.image FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 and isApprovedByHR=0 AND leaveType = ${leaveType} LIMIT ${skip}, ${limit};`

    if (search) {
        let searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 and isApprovedByHR=0 AND leaveType = ${leaveType}  AND (fullName LIKE ${search} OR divisionName LIKE ${search} OR leaveDescription LIKE ${searching});`
        getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, requestLeave.image FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 and isApprovedByHR=0 AND leaveType = ${leaveType}  AND (fullName LIKE ${searching} OR divisionName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getRequestSickLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName, requestLeave.image FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 and isApprovedByHR=0 AND leaveType = ${leaveType} AND (fullName LIKE ${searching} OR divisionName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
    }

    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalRecords % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRequestSickLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRequestSickLeave = { meta : metaDataRequestSickLeave, data: getRequestSickLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/approved-sick-leave2-by-hr', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Sick Leave 2 by HR', listOfRequestSickLeave: listOfRequestSickLeave})
}

const processApprovedRequestSickLeave2ByHR = async (req, res) => {
    try {
        const { uuid, is_approved, comments, employee_id } = req.body;
        let approved_date = moment().format('DD-MM-yyyy');
        let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
        const approvedBy = req.user.fullName;

        if (is_approved == 1) {
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

            const getDataRequestSickLeave2 = await prisma.requestLeave.findFirst({
                where: {
                    uuid: uuid,
                },
                select: {
                    startDuration: true,
                    endDuration: true,
                }
            })

            let startDuration = moment(getDataRequestSickLeave2.startDuration);
            let endDuration = moment(getDataRequestSickLeave2.endDuration);
            let daysOfSickLeave2 = moment.duration(endDuration.diff(startDuration)).asDays() + 1;
            let workDate = moment(startDuration, "DD-MM-YYYY").add(1, 'days');

            const getSetupWorkDays = await prisma.setupSystem.findFirst({
                select: {
                    workDays: true,
                }
            })

            let workDays = 5;
            if (getSetupWorkDays)
                workDays = getSetupWorkDays.workDays;

            let isDataExist = false;
            let isExistTimeAttendance = false;
            for (let index = 0; index < daysOfSickLeave2; index++) {
                workDate = moment(startDuration, "DD-MM-YYYY").add(index, 'days');
                let dayOfWorkDate = moment.utc(workDate).format('dddd');
                isDataExist = await isExistTimeAttendanceEmployee(Number(employee_id), workDate);
                if (workDays == 5) {
                    if (dayOfWorkDate == 'Saturday' || dayOfWorkDate == 'Sunday') {
                    } else {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            if (isDataExist == true)
                                isExistTimeAttendance = true;
                        }
                    }
                } else {
                    if (dayOfWorkDate != 'Sunday') {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            if (isDataExist == true)
                                isExistTimeAttendance = true;
                        }
                    }
                }                
            }
            
            if (Boolean(isExistTimeAttendance)) {
                console.log('sukses')
                req.flash('uuid', uuid);
                req.flash('error', 'The Data of time attendance already exist !!!');
                res.redirect('back');
                return 'data exists';
            }
            
            for (let index = 0; index < daysOfSickLeave2; index++) {
                workDate = moment(startDuration, "DD-MM-YYYY").add(index, 'days');
                let checkIn = moment.utc(workDate).format('YYYY-MM-DD') + ' 00:00:01';
                let checkOut = moment.utc(workDate).format('YYYY-MM-DD') + ' 00:00:01';
                let dayOfWorkDate = moment.utc(workDate).format('dddd');

                if (workDays == 5) {
                    if (dayOfWorkDate == 'Saturday' || dayOfWorkDate == 'Sunday') {
                    } else {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        
                        if (getCalendar == null) {
                            const inserData = await prisma.timeAttendance.create({
                                data: {
                                    employeeId: Number(employee_id),
                                    workDate: moment.utc(workDate).toDate(),
                                    status: 'S', //sick leave2
                                    reason: 'Sick Leave2',
                                    checkIn: moment.utc(checkIn).toDate(),
                                    checkOut: moment.utc(checkOut).toDate(),
                                    fullName: getDataEmployee.fullName,
                                    businessUnitId: getDataEmployee.businessUnit.id,
                                    businessUnitName: getDataEmployee.businessUnit.businessUnitName,
                                    divisionId: getDataEmployee.division.id,
                                    divisionName: getDataEmployee.division.divisionName,
                                    jobTitleId: getDataEmployee.jobTitle.id,
                                    jobTitleName: getDataEmployee.jobTitle.jobTitleName,
                                    createdBy: approvedBy,
                                    updatedBy: approvedBy,
                                }
                            })
                        }
                    }
                } else {
                    if (dayOfWorkDate != 'Sunday') {
                        const getCalendar = await prisma.setupCalendar.findFirst({
                            where: {
                                eventDate: moment.utc(workDate).toDate(),
                                is_workdays: 0,
                            }
                        })
                        if (getCalendar == null) {
                            const inserData = await prisma.timeAttendance.create({
                                data: {
                                    employeeId: Number(employee_id),
                                    workDate: moment.utc(workDate).toDate(),
                                    status: 'S', //sick leave
                                    reason: 'Sick Leave2',
                                    checkIn: moment.utc(checkIn).toDate(),
                                    checkOut: moment.utc(checkOut).toDate(),
                                    fullName: getDataEmployee.fullName,
                                    businessUnitId: getDataEmployee.businessUnit.id,
                                    businessUnitName: getDataEmployee.businessUnit.businessUnitName,
                                    divisionId: getDataEmployee.division.id,
                                    divisionName: getDataEmployee.division.divisionName,
                                    jobTitleId: getDataEmployee.jobTitle.id,
                                    jobTitleName: getDataEmployee.jobTitle.jobTitleName,
                                    createdBy: approvedBy,
                                    updatedBy: approvedBy,
                                }
                            })
                        }
                    }
                }
            }    
            
            const updateRequestSickLeave2 = await prisma.requestLeave.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    isApprovedByHR: Number(is_approved),
                    approvedDateByHR: moment.utc(approvedDate).toDate(),
                    approvedHRBy: approvedBy,     
                    commentsByHR: comments,           
                }
            })

            req.flash('success', 'Approve sick leave 2 by HR successfully !!');
            res.redirect('back');
        } else if (is_approved == 2) {
            const updateRequestSickLeave = await prisma.requestLeave.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    isApprovedByHR: Number(is_approved),
                    approvedDateByHR: moment.utc(approvedDate).toDate(),
                    approvedHRBy: approvedBy,     
                    commentsByHR: comments,            
                }
            })

            req.flash('success', 'Denied sick leave 2 by HR successfully !!');
            res.redirect('back');
        }
    } catch (err) {
        console.log(err.message);
        req.flash('error', err.message);
        res.redirect('back');
    }
}

const approvedRequestUnpaidLeaveBySupervisor = async (req, res) => {
    const leaveType =  4; //'Unpaid Leave';
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id};`
    let getRequestUnpaidLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} LIMIT ${limit};`
    if (skip > 0)
        getRequestUnpaidLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} LIMIT ${skip}, ${limit};`
    
    if (search) {
        searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND fullName LIKE ${searching};`
        getRequestUnpaidLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getRequestUnpaidLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=0 AND leaveType = ${leaveType} AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
    }
    
    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalRecords % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRequestUnpaidLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRequestUnpaidLeave = { meta : metaDataRequestUnpaidLeave, data: getRequestUnpaidLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    
    res.render('pages/leave-management/approved-unpaid-leave-by-supervisor', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Unpaid Leave By Supervisor', listOfRequestUnpaidLeave: listOfRequestUnpaidLeave})
}

const processApprovedRequestUnpaidLeaveBySupervisor = async (req, res) => {
    const { uuid, is_approved, comments, days, employee_id } = req.body;
    let approved_date = moment.utc().format('DD-MM-yyyy');
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
    const approvedBy = req.user.fullName;

    if (is_approved == 1) {
        const getDataRequestAnnualLeave = await prisma.requestLeave.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                startDuration: true,
                endDuration: true,
            }
        })
        let startDuration = moment(getDataRequestAnnualLeave.startDuration);
        let endDuration = moment(getDataRequestAnnualLeave.endDuration);
        let daysOfUnpaidLeave = moment.duration(endDuration.diff(startDuration)).asDays() + 1;
        let workDate = moment(startDuration, "DD-MM-YYYY").add(1, 'days');
    
        const getSetupWorkDays = await prisma.setupSystem.findFirst({
            select: {
                workDays: true,
            }
        })
    
        let workDays = 5;
        if (getSetupWorkDays)
            workDays = getSetupWorkDays.workDays;

        let isDataExist = false;
        let isExistTimeAttendance = false;
        for (let index = 0; index < daysOfUnpaidLeave; index++) {
            workDate = moment(startDuration, "DD-MM-YYYY").add(index, 'days');
            let dayOfWorkDate = moment.utc(workDate).format('dddd');
            isDataExist = await isExistTimeAttendanceEmployee(Number(employee_id), workDate);
            if (workDays == 5) {
                if (dayOfWorkDate == 'Saturday' || dayOfWorkDate == 'Sunday') {
                } else {
                    const getCalendar = await prisma.setupCalendar.findFirst({
                        where: {
                            eventDate: moment.utc(workDate).toDate(),
                            is_workdays: 0,
                        }
                    })
                    if (getCalendar == null) {
                        if (isDataExist == true)
                            isExistTimeAttendance = true;
                    }
                }
            } else {
                if (dayOfWorkDate != 'Sunday') {
                    const getCalendar = await prisma.setupCalendar.findFirst({
                        where: {
                            eventDate: moment.utc(workDate).toDate(),
                            is_workdays: 0,
                        }
                    })
                    if (getCalendar == null) {
                        if (isDataExist == true)
                            isExistTimeAttendance = true;
                    }
                }
            }                
        }
        
        if (Boolean(isExistTimeAttendance)) {
            req.flash('uuid', uuid);
            req.flash('error', 'The Data of time attendance already exist !!!');
            res.redirect('back');
            return 'data exists';
        }

        const updateRequestAnnualLeave = await prisma.requestLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApproved: Number(is_approved),
                approvedDate: moment.utc(approvedDate).toDate(),
                approvedBy,     
                commentsBySupervisor: comments,           
            }
        })

        req.flash('success', 'Approve unpaid leave by supervisor successfully !!');
        res.redirect('back');
    } else if (is_approved == 2) {
        const updateRequestAnnualLeave = await prisma.requestLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApproved: Number(is_approved),
                approvedDate: moment.utc(approvedDate).toDate(),
                approvedBy,     
                commentsBySupervisor: comments,
            }
        })

        req.flash('success', 'Denied unpaid leave by supervisor successfully !!');
        res.redirect('back');
    }
}

const approvedRequestUnpaidLeaveByHR = async (req, res) => {
    const leaveType =  4; //'Unpaid Leave';
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType};`
    let getRequestUnpaidLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} LIMIT ${limit};`
    if (skip > 0)
        getRequestUnpaidLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} LIMIT ${skip}, ${limit};`
    
    if (search) {
        searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} AND fullName LIKE ${searching};`
        getRequestUnpaidLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getRequestUnpaidLeave = await prisma.$queryRaw`SELECT requestLeave.id, requestLeave.uuid, requestLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND leaveType = ${leaveType} AND (fullName LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
    }
    
    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalRecords % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRequestUnpaidLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRequestUnpaidLeave = { meta : metaDataRequestUnpaidLeave, data: getRequestUnpaidLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/approved-unpaid-leave-by-hr', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Unpaid Leave by HR', listOfRequestUnpaidLeave: listOfRequestUnpaidLeave})
}

const processApprovedRequestUnpaidLeaveByHR = async (req, res) => {
    const { uuid, is_approved, comments, days, employee_id } = req.body;
    let approved_date = moment.utc().format('DD-MM-yyyy');
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];

    const approvedBy = req.user.fullName;

    if (is_approved == 1) {
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

        const getDataRequestAnnualLeave = await prisma.requestLeave.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                startDuration: true,
                endDuration: true,
            }
        })
        let startDuration = moment(getDataRequestAnnualLeave.startDuration);
        let endDuration = moment(getDataRequestAnnualLeave.endDuration);
        let daysOfUnpaidLeave = moment.duration(endDuration.diff(startDuration)).asDays() + 1;
        let workDate = moment(startDuration, "DD-MM-YYYY").add(1, 'days');
    
        const getSetupWorkDays = await prisma.setupSystem.findFirst({
            select: {
                workDays: true,
            }
        })
    
        let workDays = 5;
        if (getSetupWorkDays)
            workDays = getSetupWorkDays.workDays;

        let isDataExist = false;
        let isExistTimeAttendance = false;
        for (let index = 0; index < daysOfUnpaidLeave; index++) {
            workDate = moment(startDuration, "DD-MM-YYYY").add(index, 'days');
            let dayOfWorkDate = moment.utc(workDate).format('dddd');
            isDataExist = await isExistTimeAttendanceEmployee(Number(employee_id), workDate);
            if (workDays == 5) {
                if (dayOfWorkDate == 'Saturday' || dayOfWorkDate == 'Sunday') {
                } else {
                    const getCalendar = await prisma.setupCalendar.findFirst({
                        where: {
                            eventDate: moment.utc(workDate).toDate(),
                            is_workdays: 0,
                        }
                    })
                    if (getCalendar == null) {
                        if (isDataExist == true)
                            isExistTimeAttendance = true;
                    }
                }
            } else {
                if (dayOfWorkDate != 'Sunday') {
                    const getCalendar = await prisma.setupCalendar.findFirst({
                        where: {
                            eventDate: moment.utc(workDate).toDate(),
                            is_workdays: 0,
                        }
                    })
                    if (getCalendar == null) {
                        if (isDataExist == true)
                            isExistTimeAttendance = true;
                    }
                }
            }                
        }
        
        if (Boolean(isExistTimeAttendance)) {
            req.flash('uuid', uuid);
            req.flash('error', 'The Data of time attendance already exist !!!');
            res.redirect('back');
            return 'data exists';
        }
        
        for (let index = 0; index < daysOfUnpaidLeave; index++) {
            workDate = moment(startDuration, "DD-MM-YYYY").add(index, 'days');
            let checkIn = moment.utc(workDate).format('YYYY-MM-DD') + ' 00:00:01';
            let checkOut = moment.utc(workDate).format('YYYY-MM-DD') + ' 00:00:01';
            let dayOfWorkDate = moment.utc(workDate).format('dddd');
    
            if (workDays == 5) {
                if (dayOfWorkDate == 'Saturday' || dayOfWorkDate == 'Sunday') {
                } else {
                    const getCalendar = await prisma.setupCalendar.findFirst({
                        where: {
                            eventDate: moment.utc(workDate).toDate(),
                            is_workdays: 0,
                        }
                    })
                    
                    if (getCalendar == null) {
                        const inserData = await prisma.timeAttendance.create({
                            data: {
                                employeeId: Number(employee_id),
                                workDate: moment.utc(workDate).toDate(),
                                status: 'U', //unpaid leave
                                reason: 'Unpaid Leave',
                                checkIn: moment.utc(checkIn).toDate(),
                                checkOut: moment.utc(checkOut).toDate(),
                                fullName: getDataEmployee.fullName,
                                businessUnitId: getDataEmployee.businessUnit.id,
                                businessUnitName: getDataEmployee.businessUnit.businessUnitName,
                                divisionId: getDataEmployee.division.id,
                                divisionName: getDataEmployee.division.divisionName,
                                jobTitleId: getDataEmployee.jobTitle.id,
                                jobTitleName: getDataEmployee.jobTitle.jobTitleName,
                                createdBy: approvedBy,
                                updatedBy: approvedBy,
                            }
                        })
                    }
                }
            } else {
                if (dayOfWorkDate != 'Sunday') {
                    const getCalendar = await prisma.setupCalendar.findFirst({
                        where: {
                            eventDate: moment.utc(workDate).toDate(),
                            is_workdays: 0,
                        }
                    })
                    if (getCalendar == null) {
                        const inserData = await prisma.timeAttendance.create({
                            data: {
                                employeeId: Number(employee_id),
                                workDate: moment.utc(workDate).toDate(),
                                status: 'N', //annual leave
                                reason: 'Annual Leave',
                                checkIn: moment.utc(checkIn).toDate(),
                                checkOut: moment.utc(checkOut).toDate(),
                                fullName: getDataEmployee.fullName,
                                businessUnitId: getDataEmployee.businessUnit.id,
                                businessUnitName: getDataEmployee.businessUnit.businessUnitName,
                                divisionId: getDataEmployee.division.id,
                                divisionName: getDataEmployee.division.divisionName,
                                jobTitleId: getDataEmployee.jobTitle.id,
                                jobTitleName: getDataEmployee.jobTitle.jobTitleName,
                                createdBy: approvedBy,
                                updatedBy: approvedBy,
                            }
                        })
                    }
                }
            }
        }   

        const updateRequestAnnualLeave = await prisma.requestLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApprovedByHR: Number(is_approved),
                approvedDateByHR: moment.utc(approvedDate).toDate(),
                approvedHRBy: approvedBy,     
                commentsByHR: comments,           
            }
        })

        req.flash('success', 'Approve unpaid leave by HR successfully !!');
        res.redirect('back');
    } else if (is_approved == 2) {
        const updateRequestAnnualLeave = await prisma.requestLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApprovedByHR: Number(is_approved),
                approvedDateByHR: moment.utc(approvedDate).toDate(),
                approvedHRBy: approvedBy,     
                commentsByHR: comments,              
            }
        })

        req.flash('success', 'Denied unpaid leave by HR successfully !!');
        res.redirect('back');
    }
}

module.exports = {
    showConfigureAnnualLeave,
    updateConfigureAnnualLeave,
    showConfigureSickLeave,
    updateConfigureSickLeave,
    approvedRequestAnnualLeaveBySupervisor,
    processApprovedRequestAnnualLeaveBySupervisor,
    approvedRequestAnnualLeaveByHR,
    processApprovedRequestAnnualLeaveByHR,
    getRequestLeaveByUuid,
    approvedRequestSickLeaveBySupervisor,
    processApprovedRequestSickLeaveBySupervisor,
    approvedRequestSickLeaveByHR,
    processApprovedRequestSickLeaveByHR,
    calculateAnnualLeave,
    calculateSickLeave,
    approvedRequestSickLeave2BySupervisor,
    processApprovedRequestSickLeave2BySupervisor,
    approvedRequestSickLeave2ByHR,
    processApprovedRequestSickLeave2ByHR,
    approvedRequestUnpaidLeaveBySupervisor,
    processApprovedRequestUnpaidLeaveBySupervisor,
    approvedRequestUnpaidLeaveByHR,
    processApprovedRequestUnpaidLeaveByHR,
}
