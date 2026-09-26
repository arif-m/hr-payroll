const prisma = require('../libs/prisma');

const moment = require('moment');
const { isExistTimeAttendanceEmployee } = require('../helper/general');
const { findOverlaps, buildOverlapMessage } = require('../libs/leave/overlap');
const { listRolesPermission } = require('../helper/roles-permission');

const showIndex = async (req, res) => {
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search){
        where = { description : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.requestOtherLeave.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalPage % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataRequestOtherLeave = await prisma.requestOtherLeave.findMany({
        skip: skip,
        take: limit,
        where,
    })

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRequestOtherLeave = { meta : metaDataRoles, data: getDataRequestOtherLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, pageTitle: "Request Other Leave", getRoles, listOfRequestOtherLeave: listOfRequestOtherLeave };
    res.render('pages/request-other-leave/index', param);
}

const requestOtherLeave = async (req, res) => {
    const uuid = req.user.uuid;
    const employeeData = await prisma.users.findUnique({
        where: {
            uuid: uuid,
        },
        select: {
            id: true,
            uuid: true,
            employeeId: true,
            status: true,
            role: {
                select: {
                  id: true,
                  roleName: true,
                },
            },
            fullName: true,
            joinDate: true,
            email: true,
            mobilePhone: true,
            dob: true,
            placeOfBirth: true,
            personalIdType: true,
            personalIdNumber: true,
            address: true,
            employmentStatus: true,
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
            basicSalary: true,
            npwp: true,
        },
    })

    const getOtherLeaveType = await prisma.otherLeaveType.findMany({
        where: {
            isActive: 1,
        },
        select: {
            id: true,
            description: true,
            limit: true,
        }
    });

    const getSetupWorkDays = await prisma.setupSystem.findFirst({
        select: {
            workDays: true,
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, pageTitle: "Request Other Leave", getRoles, employeeData: employeeData, listOfOtherLeaveType: getOtherLeaveType, getWorkDays: getSetupWorkDays };
    res.render('pages/employee/request-other-leave', param);
}

const processRequestOtherLeave = async (req, res) => {
    try {
        const { leave_description, start_duration, end_duration, days, leave_type, leave_type_description, id, business_unit_id, business_unit_name, division_id, division_name, jobtitle_id, jobtitle_name } = req.body;
        const startDuration = start_duration.split("-")[2] + '-' + start_duration.split("-")[1] + '-' + start_duration.split("-")[0];
        const endDuration = end_duration.split("-")[2] + '-' + end_duration.split("-")[1] + '-' + end_duration.split("-")[0];
        const createdBy = req.user.fullName;
        const updatedBy = req.user.fullName;
    
        const userInfo = req.user;
        const getDataUser = await prisma.users.findFirst({
            where: {
                uuid: userInfo.uuid,
            },
            select: {
                employmentStatus: true,
            }
        })
    
        if(getDataUser.employmentStatus != 'Permanent') {
            req.flash('error', 'Employement status is ' + getDataUser.employmentStatus + ', you cannot submit request annual leave !!!')
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);        
            res.redirect('back');
            return
        }
        if(req.body.days == 0) {
            req.flash('error', 'Total day of request leave is ' + req.body.days + ', you cannot submit request annual leave !!!')
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);        
            res.redirect('back');
            return
        }    
        if (req.body.limit_day2 == 0) {
            req.flash('error', 'Your limit day is ' + req.body.limit_day2 + ', you cannot submit request other leave !!!')
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);        
            res.redirect('back');
            return
        }
    
        if (Number(req.body.limit_day2) != Number(req.body.days)) {
            req.flash('error', 'Your days off are not the same with limit day, you cannot submit request other leave !!!')
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);        
            res.redirect('back');
            return
        }
    
        const overlapRequests = await findOverlaps(prisma, { employeeId: Number(id), start: moment.utc(startDuration).toDate(), end: moment.utc(endDuration).toDate() });
        if (overlapRequests.length > 0) {
            req.flash('error', buildOverlapMessage(overlapRequests));
            res.redirect('back');
            return
        }

        const insertRequestOtherLeave = await prisma.requestOtherLeave.create({
            data: {
                leaveDescription: leave_description,
                startDuration: moment.utc(startDuration).toDate(),
                endDuration: moment.utc(endDuration).toDate(),
                days: Number(days),
                employeeId: Number(id),
                otherLeaveType: Number(leave_type),
                otherleaveTypeDescription: leave_type_description,
                divisionId: Number(division_id),
                divisionName: division_name,
                businessUnitId: Number(business_unit_id),
                businessUnitName: business_unit_name,
                jobTitleId: Number(jobtitle_id),
                jobTitleName: jobtitle_name,
                createdBy,
                updatedBy,
            }
        })
        req.flash('success', 'Request other leave successfull')
        res.redirect('back');
    } catch (err) {
        req.flash('error', err.message)
        res.redirect('back');        
    }

}

const getLimitDayOfOtherLeaveType = async (req, res) => {
    const { id } = req.params;
    const getData = await prisma.otherLeaveType.findFirst({
        where: {
            id: Number(id),
        },
        select: {
            description: true,
            limit: true,
        }
    })

    res.status(200).send({
        status: true,
        statusCode: 200,
        message: 'Get data successfully',
        data: getData
    });   
}

const approvedRequestOtherLeaveBySupervisor = async (req, res) => {
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id};`
    let getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.id, requestOtherLeave.uuid, requestOtherLeave.employeeId, fullName, startDuration, endDuration, days, otherLeaveTypeDescription, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id};`
    if (skip > 0)
        getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.id, requestOtherLeave.uuid, requestOtherLeave.employeeId, fullName, startDuration, endDuration, days, otherLeaveTypeDescription, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id} LIMIT ${skip}, ${limit};`

    if (search) {
        searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved = 0 AND (fullName LIKE ${search} OR otherLeaveTypeDescription LIKE ${searching} OR leaveDescription LIKE ${searching});`
        getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.id, requestOtherLeave.uuid, requestOtherLeave.employeeId, fullName, startDuration, endDuration, days, otherLeaveTypeDescription, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR otherLeaveTypeDescription LIKE ${searching} OR leaveDescription LIKE ${searching}) ${limit};`
        if (skip > 0)
            getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.id, requestOtherLeave.uuid, requestOtherLeave.employeeId, fullName, startDuration, endDuration, days, otherLeaveTypeDescription, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id} AND (fullName LIKE ${searching} OR otherLeaveTypeDescription LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
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
    const listOfRequestOtherLeave = { meta : metaDataRequestSickLeave, data: getRequestOtherLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/approved-other-leave-by-supervisor', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Other Leave by Supervisor', listOfRequestOtherLeave: listOfRequestOtherLeave})
}

const processApprovedRequestOtherLeaveBySupervisor = async (req, res) => {
    const { uuid, is_approved, comments, employee_id } = req.body;
    let approved_date = moment().format('DD-MM-yyyy');
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
    const approvedBy = req.user.fullName;

    if (is_approved == 1) {
        const getDataRequestOtherLeave = await prisma.requestOtherLeave.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                startDuration: true,
                endDuration: true,
            }
        })

        let startDuration = moment(getDataRequestOtherLeave.startDuration);
        let endDuration = moment(getDataRequestOtherLeave.endDuration);
        let daysOfOtherLeave = moment.duration(endDuration.diff(startDuration)).asDays() + 1;
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
        for (let index = 0; index < daysOfOtherLeave; index++) {
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
            req.flash('error', 'Tanggal ' + moment.utc(workDate).format('DD-MM-YYYY') + ' sudah punya data absensi (kemungkinan ada cuti lain yang sudah disetujui pada tanggal tersebut). Tolak pengajuan ini bila periode-nya tumpang tindih, atau konsultasikan ke HR.');
            res.redirect('back');
            return 'data exists';
        }
        const updateRequestOtherkLeave = await prisma.requestOtherLeave.update({
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

        req.flash('success', 'Approve other leave by supervisor successfully !!');
        res.redirect('back');
    
    } else if (is_approved == 2) {
        const updateRequestAnnualLeave = await prisma.requestOtherLeave.update({
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

        req.flash('success', 'Denied other leave by supervisor successfully !!');
        res.redirect('back');
    }
}

const approvedRequestOtherLeaveByHR = async (req, res) => {
    const query = req.query;
    let search = query.search;

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0;`
    let getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.id, requestOtherLeave.uuid, requestOtherLeave.employeeId, fullName, startDuration, endDuration, days, otherLeaveTypeDescription, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0;`
    if (skip > 0)
        getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.id, requestOtherLeave.uuid, requestOtherLeave.employeeId, fullName, startDuration, endDuration, days, otherLeaveTypeDescription, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 LIMIT ${skip}, ${limit};`

    if (search) {
        let searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND (fullName LIKE ${search} OR otherLeaveTypeDescription LIKE ${searching} OR leaveDescription LIKE ${searching});`
        getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.id, requestOtherLeave.uuid, requestOtherLeave.employeeId, fullName, startDuration, endDuration, days, otherLeaveTypeDescription, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0 AND (fullName LIKE ${searching} OR otherLeaveTypeDescription LIKE ${searching} OR leaveDescription LIKE ${searching}) ${limit};`
        if (skip > 0)
            getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.id, requestOtherLeave.uuid, requestOtherLeave.employeeId, fullName, startDuration, endDuration, days, otherLeaveTypeDescription, leaveDescription, businessUnitName, jobTitleName, divisionName FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE isApproved=1 AND isApprovedByHR=0AND (fullName LIKE ${searching} OR otherLeaveTypeDescription LIKE ${searching} OR leaveDescription LIKE ${searching}) LIMIT ${skip}, ${limit};`
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
    const listOfRequestOtherLeave = { meta : metaDataRequestSickLeave, data: getRequestOtherLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/leave-management/approved-other-leave-by-hr', {user: userInfo, search, getRoles, moment, pageTitle: 'Approve / Denied Other Leave by HR', listOfRequestOtherLeave: listOfRequestOtherLeave})
}

const processApprovedRequestOtherLeaveByHR = async (req, res) => {
    const { uuid, is_approved, comments, employee_id } = req.body;
    let approved_date = moment().format('DD-MM-yyyy');
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
    //let approvedDateDDMMYY =  approved_date.split("-")[0] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[2];
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

        const getDataRequestOtherLeave = await prisma.requestOtherLeave.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                startDuration: true,
                endDuration: true,
            }
        })

        let startDuration = moment(getDataRequestOtherLeave.startDuration);
        let endDuration = moment(getDataRequestOtherLeave.endDuration);
        let daysOfOtherLeave = moment.duration(endDuration.diff(startDuration)).asDays() + 1;
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
        for (let index = 0; index < daysOfOtherLeave; index++) {
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
            req.flash('error', 'Tanggal ' + moment.utc(workDate).format('DD-MM-YYYY') + ' sudah punya data absensi (kemungkinan ada cuti lain yang sudah disetujui pada tanggal tersebut). Tolak pengajuan ini bila periode-nya tumpang tindih, atau konsultasikan ke HR.');
            res.redirect('back');
            return 'data exists';
        }
        
        for (let index = 0; index < daysOfOtherLeave; index++) {
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

        const updateRequestOtherkLeave = await prisma.requestOtherLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApprovedByHR: Number(is_approved),
                approvedDateByHR: moment.utc(approvedDate).toDate(),
                approvedHRBy : approvedBy,     
                commentsByHR: comments,           
            }
        })

        req.flash('success', 'Approve other leave by HR successfully !!');
        res.redirect('back');
    
    } else if (is_approved == 2) {
        const updateRequestAnnualLeave = await prisma.requestOtherLeave.update({
            where: {
                uuid: uuid,
            },
            data: {
                isApprovedByHR: Number(is_approved),
                approvedDateByHR: moment.utc(approvedDate).toDate(),
                approvedHRBy : approvedBy,     
                commentsByHR: comments,            
            }
        })

        req.flash('success', 'Denied other leave by HR successfully !!');
        res.redirect('back');
    }
}

const getOtherLeaveByUuid = async (req, res) => {
    const uuid = req.params.uuid;
    const getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.id, requestOtherLeave.uuid, requestOtherLeave.employeeId, fullName, startDuration, endDuration, days, leaveDescription, otherleaveTypeDescription, businessUnitName, jobTitleName, divisionName, isApproved, approvedDate, commentsBySupervisor, isApprovedByHR, approvedDateByHR, commentsByHR FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE requestOtherLeave.uuid = ${uuid};`

    if(getRequestOtherLeave === undefined ||  getRequestOtherLeave.length == 0) {
        res.status(404).send({
            status: true,
            statusCode: 404,
            message: 'Get data detail unsuccessfully',
            data: getRequestOtherLeave
        });    
    } else {
        res.status(200).send({
            status: true,
            statusCode: 200,
            message: 'Get data detail successfully',
            data: getRequestOtherLeave
        });    
    }
}

module.exports = {
    showIndex,
    requestOtherLeave,
    processRequestOtherLeave,
    getLimitDayOfOtherLeaveType,
    getOtherLeaveByUuid,
    approvedRequestOtherLeaveBySupervisor,
    processApprovedRequestOtherLeaveBySupervisor,
    approvedRequestOtherLeaveByHR,
    processApprovedRequestOtherLeaveByHR,
}