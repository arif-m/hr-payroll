const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');
const moment = require('moment');
const generalHelper = require('../helper/general');
const { DefaultDeserializer } = require('v8');

const listOfOvertime = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search) {
        where = { OR: [
                    {
                        description: {
                            contains: search                    
                        },                                
                    },
                    {
                        divisionTbl: {
                            divisionName: {
                                contains: search  
                            }                  
                        },                                
                    },
                    /*{ 
                        typeOfDay: {
                            in: search                    
                        }
                    },*/
                ]
            },
            { divisionId: Number(userInfo.divisionId) }
        } else {
        where = { divisionId: Number(userInfo.divisionId) }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.requestOvertimeHeader.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataOvertime = await prisma.requestOvertimeHeader.findMany({
        skip: skip,
        take: limit,
        where,
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            uuid: true,
            overtimeDate: true,
            typeOfDay: true,
            description: true,
            isApprovedByHead: true,
            isApprovedByHR: true,
            divisionId: true,
            divisionTbl: {
                select: {
                    divisionName: true,
                }
            }

        }
    })

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfOvertime = { meta : metaDataRoles, data: getDataOvertime};

    let param = { user: userInfo, pageTitle: "Request of Overtime", search, moment, getRoles, listOfOvertime };
    res.render('pages/overtime/index', param);
}

const addRequestOvertime = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
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
            medicalReimbursementBudget: true,
            medicalReimbursementRemaining: true,
        },
    })

    const listOfDivision = await prisma.division.findMany({
        select: {
            id: true,
            divisionName: true,
        }
    })

    let param = { user: userInfo, pageTitle: "New Request Overtime", getRoles, listOfDivision, employeeData };
    res.render('pages/overtime/add-request', param);
}

const detailsOfOvertime = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const uuid = req.params.uuid;

    const getDataRequestOvertimeHeader = await prisma.requestOvertimeHeader.findFirst({
        where: {
            uuid: uuid,
        }
    })
    const getDataRequestOvertimeDetails = await prisma.requestOvertimeDetails.findMany({
        where: {
            requestOvertimeHeaderId: getDataRequestOvertimeHeader.id,
        }
    })
    const listOfDivision = await prisma.division.findMany({
        select: {
            id: true,
            divisionName: true,
        }
    })

    let param = { user: userInfo, pageTitle: "Show Request Overtime", moment, getRoles, listOfDivision, getDataRequestOvertimeHeader, getDataRequestOvertimeDetails };
    res.render('pages/overtime/show-request', param);
}

const storeDataOvertime = async (req, res) => {
    const { description_header, type_of_day, overtime_date, division_id } = req.body;
    const overtimeDate = overtime_date.split("-")[2] + '-' + overtime_date.split("-")[1] + '-' + overtime_date.split("-")[0];
    const checkDataDetails = req.body.start;

    if (checkDataDetails === undefined) {
        req.flash('error', 'You have to fill data details !!!')
        req.flash('description_header', description_header);
        req.flash('type_of_day', type_of_day);
        req.flash('overtime_date', overtime_date);
        res.redirect('back');
        return;
    }

    try {
        const createdBy = req.user.fullName;
        const updatedBy = req.user.fullName;
    
        const insertRequestOvertimeHeader = await prisma.requestOvertimeHeader.create({
            data: {
                overtimeDate: moment.utc(overtimeDate).toDate(),
                typeOfDay: type_of_day,
                description: description_header,
                divisionId: Number(division_id),
                createdBy,
                updatedBy,
            }
        })
    
        if (typeof checkDataDetails != "object") {
            employeeId = req.body.employee;
            const getEmployeeAttribut = await prisma.users.findFirst({
                where: {
                    id: Number(employeeId),
                },
                select: {
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
            description = req.body.description;
            startTime = req.body.start;
            endTime = req.body.end;

            const insertOvertimeDetails = await prisma.requestOvertimeDetails.create({
                data: {
                    requestOvertimeHeaderId: Number(insertRequestOvertimeHeader.id),
                    startTime: moment.utc(overtimeDate + ' ' + startTime + ':00').toDate(),
                    endTime: moment.utc(overtimeDate + ' ' + endTime + ':00').toDate(),
                    employeeId: Number(employeeId),
                    fullName: getEmployeeAttribut.fullName,
                    organization: getEmployeeAttribut.businessUnit.businessUnitName,
                    jobTitle: getEmployeeAttribut.jobTitle.jobTitleName,
                    createdBy,
                    updatedBy,
                }
            })   
        } else {
            for(var i = 0; i < checkDataDetails.length; ++i) {
                employeeId = req.body.employee;
                const getEmployeeAttribut = await prisma.users.findFirst({
                    where: {
                        id: Number(employeeId[i]),
                    },
                    select: {
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
                employee = req.body.employee[i];
                startTime = req.body.start[i];
                endTime = req.body.end[i];
                const insertRequestOvertimeDetails = await prisma.requestOvertimeDetails.create({
                    data: {
                        requestOvertimeHeaderId: Number(insertRequestOvertimeHeader.id),
                        startTime: moment.utc(overtimeDate + ' ' + startTime + ':00').toDate(),
                        endTime: moment.utc(overtimeDate + ' ' + endTime + ':00').toDate(),
                        employeeId: Number(employee),
                        fullName: getEmployeeAttribut.fullName,
                        organization: getEmployeeAttribut.businessUnit.businessUnitName,
                        jobTitle: getEmployeeAttribut.jobTitle.jobTitleName,
                        createdBy,
                        updatedBy,
                    }
                })        
            }    
        } 
        req.flash('success', 'Request overtime successfully')
        res.redirect('/request-overtime');
    } catch (error) {
        console.log('error... ')
        console.log(error.message);
        req.flash('error', error.message);
        res.redirect('back');
    }
}

const approveRequestOvertimeByHead = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search) {
        where = { OR: [
                    {
                        description: {
                            contains: search                    
                        },                                
                    },
                    {
                        divisionTbl: {
                            divisionName: {
                                contains: search  
                            }                  
                        },                                
                    },
                    /*{ 
                        typeOfDay: {
                            in: search                    
                        }
                    },*/
                ]
            },
            { divisionId: Number(userInfo.divisionId), isApprovedByHead: 0, }
    } else {
        where = { 
            divisionId: Number(userInfo.divisionId), 
            isApprovedByHead: 0, 
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.requestOvertimeHeader.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataOvertime = await prisma.requestOvertimeHeader.findMany({
        skip: skip,
        take: limit,
        where,
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            uuid: true,
            overtimeDate: true,
            typeOfDay: true,
            description: true,
            isApprovedByHead: true,
            isApprovedByHR: true,
            divisionId: true,
            divisionTbl: {
                select: {
                    divisionName: true,
                }
            }
        }
    })

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfOvertime = { meta : metaDataRoles, data: getDataOvertime};

    let param = { user: userInfo, pageTitle: "Approve Request Overtime By Head", search, moment, getRoles, listOfOvertime };
    res.render('pages/overtime/listing-approve-request-by-head', param);
}

const approveRequestOvertimeByHeadDetails = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const uuid = req.params.uuid;

    const getDataRequestOvertimeHeader = await prisma.requestOvertimeHeader.findFirst({
        where: {
            uuid
        },
    })
    const getDataRequestOvertimeDetails = await prisma.requestOvertimeDetails.findMany({
        where: {
            requestOvertimeHeaderId: getDataRequestOvertimeHeader.id,
        }
    })
    const listOfDivision = await prisma.division.findMany({
        select: {
            id: true,
            divisionName: true,
        }
    })

    let param = { user: userInfo, pageTitle: "Approve Request Overtime By Head", moment, getRoles, getDataRequestOvertimeHeader, listOfDivision, getDataRequestOvertimeDetails };
    res.render('pages/overtime/approve-request-by-head', param);
}

const processApproveRequestOvertimeByHead = async (req, res) => {
    try {
        const { uuid, is_approved, approved_date, comments } = req.body;
        const approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];

        const updateDataOvertime = await prisma.requestOvertimeHeader.update({
            where: {
                uuid
            },
            data: {
                isApprovedByHead: Number(is_approved),
                approvedDateByHead: moment.utc(approvedDate).toDate(),
                commentsByHead: comments,
            }
        })

        req.flash('success', 'Approve request overtime by head successfully')
        res.redirect('/approve-request-overtime-by-head/listing');
    } catch (error) {
        console.log('error... ')
        console.log(error.message);
        req.flash('error', error.message);
        res.redirect('back');
    }
}

const approveRequestOvertimeByHR = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search) {
        where = { AND: [ 
                    {
                        OR: [
                            {
                                description: {
                                    contains: search                    
                                },                                
                            },
                            {
                                divisionTbl: {
                                    divisionName: {
                                        contains: search  
                                    }                  
                                },                                
                            },
                            /*{ 
                                typeOfDay: {
                                    in: search                    
                                }
                            },*/
                        ]
                    },
                { isApprovedByHead: 1 }, 
                { isApprovedByHR: 0 }
            ]
        }
    } else {
        where = { 
            isApprovedByHead: 1, 
            isApprovedByHR: 0
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.requestOvertimeHeader.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataOvertime = await prisma.requestOvertimeHeader.findMany({
        skip: skip,
        take: limit,
        where,
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            uuid: true,
            overtimeDate: true,
            typeOfDay: true,
            description: true,
            isApprovedByHead: true,
            isApprovedByHR: true,
            divisionId: true,
            divisionTbl: {
                select: {
                    divisionName: true,
                }
            }
        }
    })

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfOvertime = { meta : metaDataRoles, data: getDataOvertime};

    let param = { user: userInfo, pageTitle: "Approve Request Overtime By HR", search, moment, getRoles, listOfOvertime };
    res.render('pages/overtime/listing-approve-request-by-hr', param);
}

const approveRequestOvertimeByHRDetails = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const uuid = req.params.uuid;

    const getDataRequestOvertimeHeader = await prisma.requestOvertimeHeader.findFirst({
        where: {
            uuid
        },
    })
    const getDataRequestOvertimeDetails = await prisma.requestOvertimeDetails.findMany({
        where: {
            requestOvertimeHeaderId: getDataRequestOvertimeHeader.id,
        }
    })
    const listOfDivision = await prisma.division.findMany({
        select: {
            id: true,
            divisionName: true,
        }
    })

    let param = { user: userInfo, pageTitle: "Approve Request Overtime By HR", moment, getRoles, getDataRequestOvertimeHeader, listOfDivision, getDataRequestOvertimeDetails };
    res.render('pages/overtime/approve-request-by-hr', param);
}

const processApproveRequestOvertimeByHR = async (req, res) => {
    const { uuid, is_approved, approved_date, comments, overtime_date } = req.body;
    const overtimeDate = overtime_date.split("-")[2] + '-' + overtime_date.split("-")[1] + '-' + overtime_date.split("-")[0];
    const checkDataDetails = req.body.uuid_detail;
    let employeeId = req.body.employee_id;
    let startTime = req.body.start_time;
    let endTime = req.body.end_time;
    const approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];

    try {                
        if (checkDataDetails === undefined) {
            req.flash('error', 'You have to fill data details !!!')
            res.redirect('back');
            return;
        }
        const getSetupWorkDays = await prisma.setupSystem.findFirst({
            select: {
                workDays: true,
            }
        })
        const dayOfOvertimeDate = moment.utc(overtimeDate).format('dddd');
        let workDays = 5;
        if (getSetupWorkDays)
            workDays = getSetupWorkDays.workDays;

        const updateDataOvertimeHeader = await prisma.requestOvertimeHeader.update({
            where: {
                uuid
            },
            data: {
                isApprovedByHR: Number(is_approved),
                approvedDateByHR: moment.utc(approvedDate).toDate(),
                commentsByHR: comments,
            }
        })
        let worksHour = 0;
        let hoursOfWorksHour = 0;
        let minutesOfWorksHour = 0;
        let multiplier = 2;

        if (typeof checkDataDetails != "object") {
            uuidDetail = req.body.uuid_detail;
            start = moment.utc(req.body.start_time, "HH:mm");
            end = moment.utc(req.body.end_time, "HH:mm");
            worksHour = moment.duration(end.diff(start));
            hoursOfWorksHour = moment.utc(+worksHour).format('H');
            minutesOfWorksHour = moment.utc(+worksHour).format('mm');
            if(minutesOfWorksHour > 0 )
                hoursOfWorksHour++;

            const getDataMultiplier = await prisma.setupOvertimeMultiplier.findFirst({
                where: {
                    numberOfOvertimeHours: hoursOfWorksHour
                },
                select: {
                    workDaysMultiplier: true,
                    workDays5MultiplierHoliday: true,
                    workDays6MultiplierHoliday: true,
                    workDays6MultiplierHolidaySortDay: true,
                }
            })
            if (workDays == 5) {
                if (dayOfOvertimeDate == 'Saturday' || dayOfOvertimeDate == 'Sunday') {
                    multiplier = getDataMultiplier.workDays5MultiplierHoliday;
                } else {
                    multiplier = getDataMultiplier.workDaysMultiplier;                    
                }
            } else if (workDays == 6) {
                if (dayOfOvertimeDate == 'Sunday') {
                    multiplier = getDataMultiplier.workDays6MultiplierHoliday;
                } else if (dayOfOvertimeDate == 'Saturday') {
                    multiplier = getDataMultiplier.workDays6MultiplierHolidaySortDay;    
                } else {
                    multiplier = getDataMultiplier.workDaysMultiplier;        
                }
            }
    
            employeeId = req.body.employee_id;
            const getDataUsersSalary = await prisma.usersSalary.aggregate({
                where: {
                    usersId: Number(employeeId),
                },
                _sum: {
                    amount: true,
                },
            })
            let totalSalary = 0;
            let hourlyWages = 0;
            if(getDataUsersSalary._sum.amount != undefined) {
                totalSalary = getDataUsersSalary._sum.amount;
                hourlyWages = Math.round(totalSalary * 1/173);
            }

            startTime = req.body.start_time;
            endTime = req.body.end_time;
            const updateDataRequestOvertimeDetails = await prisma.requestOvertimeDetails.update({
                where: {
                    uuid: uuidDetail,
                },
                data: {
                    startTime: moment.utc(overtimeDate + ' ' + startTime + ':00').toDate(),
                    endTime: moment.utc(overtimeDate + ' ' + endTime + ':00').toDate(),
                    hourlyWages,
                    workHour: hoursOfWorksHour,
                    multiplier
                }
            })
        } else {
            for(var i = 0; i < checkDataDetails.length; ++i) {
                uuidDetail = req.body.uuid_detail[i];
                start = moment.utc(req.body.start_time, "HH:mm");
                end = moment.utc(req.body.end_time, "HH:mm");
                worksHour = moment.duration(end.diff(start));
                hoursOfWorksHour = moment.utc(+worksHour).format('H');
                minutesOfWorksHour = moment.utc(+worksHour).format('mm');
                if(minutesOfWorksHour > 0 )
                    hoursOfWorksHour++;
                    
                const getDataMultiplier = await prisma.setupOvertimeMultiplier.findFirst({
                    where: {
                        numberOfOvertimeHours: hoursOfWorksHour
                    },
                    select: {
                        workDaysMultiplier: true,
                        workDays5MultiplierHoliday: true,
                        workDays6MultiplierHoliday: true,
                        workDays6MultiplierHolidaySortDay: true,
                    }
                })
                if (workDays == 5) {
                    if (dayOfOvertimeDate == 'Saturday' || dayOfOvertimeDate == 'Sunday') {
                        multiplier = getDataMultiplier.workDays5MultiplierHoliday;
                    } else {
                        multiplier = getDataMultiplier.workDaysMultiplier;                    
                    }
                } else if (workDays == 6) {
                    if (dayOfOvertimeDate == 'Sunday') {
                        multiplier = getDataMultiplier.workDays6MultiplierHoliday;
                    } else if (dayOfOvertimeDate == 'Saturday') {
                        multiplier = getDataMultiplier.workDays6MultiplierHolidaySortDay;    
                    } else {
                        multiplier = getDataMultiplier.workDaysMultiplier;        
                    }
                }

                employeeId = req.body.employee_id[i];
                const getDataUsersSalary = await prisma.usersSalary.aggregate({
                    where: {
                        usersId: Number(employeeId),
                    },
                    _sum: {
                        amount: true,
                    },
                })

                let totalSalary = 0;
                let hourlyWages = 0;
                if(getDataUsersSalary._sum.amount != undefined) {
                    totalSalary = getDataUsersSalary._sum.amount;
                    hourlyWages = Math.round(totalSalary * 1/173);
                }
                startTime = req.body.start_time[i];
                endTime = req.body.end_time[i];

                const updateDataRequestOvertimeDetails = await prisma.requestOvertimeDetails.update({
                    where: {
                        uuid: uuidDetail,
                    },
                    data: {
                        startTime: moment.utc(overtimeDate + ' ' + startTime + ':00').toDate(),
                        endTime: moment.utc(overtimeDate + ' ' + endTime + ':00').toDate(),
                        hourlyWages,
                        workHour: hoursOfWorksHour,
                        multiplier
                    }
                })
            } 
        }
        req.flash('success', 'Approve request overtime by HR successfully')
        res.redirect('/approve-request-overtime-by-hr/listing');
    } catch (error) {
        console.log('error... ')
        console.log(error.message);
        req.flash('error', error.message);
        res.redirect('back');
    }   
}

module.exports = {
    listOfOvertime,
    addRequestOvertime,
    detailsOfOvertime,
    storeDataOvertime,
    approveRequestOvertimeByHead,
    approveRequestOvertimeByHeadDetails,
    processApproveRequestOvertimeByHead,
    approveRequestOvertimeByHR,
    approveRequestOvertimeByHRDetails,
    processApproveRequestOvertimeByHR,

}