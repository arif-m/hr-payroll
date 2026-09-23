const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');

const moment = require('moment');
const { formatNumberWithoutDelimiter } = require('../helper/general');

const showIndex = async (req, res) => {
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

    const getDataGenerateSalary = await prisma.cutOffPeriod.findMany({
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
    const listOfGenerateSalary = { meta : metaData, data: getDataGenerateSalary};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'Cutoff Period', listOfGenerateSalary: listOfGenerateSalary }; 
    res.render('pages/edit-salary/index', param);
}

const showEditSalary = async (req, res) => {
    const { uuidCutoffPeriod } = req.params;
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const getDataCutoffPeriod = await prisma.cutOffPeriod.findFirst({
        where: {
            uuid: uuidCutoffPeriod,
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

    const query = req.query;
    let search = query.search;
    let where = {};
    if (query.search){
        where = { 
            OR: [ 
                {
                    fullName: {
                        contains: search                    
                    },
                },
                {
                    address: {
                        contains: search                    
                    },
                }
            ],            
            /*id: {
                equals: undefined,
            }    */      
        }
    } else {
        where = {
            id: {
                equals: undefined,
            }  
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const getDataUsers = await prisma.users.findMany({
        where,
        include: {
            user6: true,
        }
    })

    let totalRecords = 0;
    for (let index = 0; index < getDataUsers.length; index++){
        let dataPayslip = getDataUsers[index].user6;
        if (dataPayslip.length < 1) {
            totalRecords++;
        } else {
            if (dataPayslip[0].monthPeriod == getDataCutoffPeriod.monthPeriod && dataPayslip[0].yearPeriod == getDataCutoffPeriod.yearPeriod) {
            } else {
                totalRecords++;
            }
        }
    }

    const totalPage = Math.ceil(totalRecords / limit);
    const currentPage = page || 0;

    /*const getDataEditSalary = await prisma.users.findMany({
        skip: skip,
        take: limit,
        where,
        include: {
            user6: true,
            division: true,
            jobTitle: true,
        },
        
    }) */

    where = {
        monthPeriod: getDataCutoffPeriod.monthPeriod,
        yearPeriod: getDataCutoffPeriod.yearPeriod,
    }
    const getDataEditSalary = await prisma.payslipHeader.findMany({
        skip: skip,
        take: limit,
        where,
        select : {
            uuid: true,
            employeeId: true,
            fullName: true,
            organization: true,
            jobTitle: true,
        }
    })

    const metaData= { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords};
    const listOfPayslipHeader = { meta : metaData, data: getDataEditSalary};

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'Edit Salary of Employees', getDataCutoffPeriod, listOfPayslipHeader }; 
    res.render('pages/edit-salary/edit', param);
}

const showEditSalaryDetail = async (req, res) => {
    const { uuidPayslipHeader } = req.params;
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const getPayslipHeader = await prisma.payslipHeader.findFirst({
        where: {
            uuid: uuidPayslipHeader,
        },
        select : {
            id: true,
            uuid: true,
            fullName: true,
            npwp: true,
            organization: true,
            jobTitle: true,
            cutOffPeriodId: true,
        }
    })

    cutOffPeriodId = 0;
    if (getPayslipHeader) {
        cutOffPeriodId = getPayslipHeader.cutOffPeriodId;
        getCutOffPeriodId = await prisma.cutOffPeriod.findFirst({
            where: {
                id: cutOffPeriodId,
            },
            select : {
                uuid: true,
            }
        })
    }

    const listOfPayslipDetails =  await prisma.payslipDetails.findMany({
        select : {
            uuid: true,
            code: true,
            name: true,
            category: true,
            amount: true,            
        },
        where: {
            payslipHeaderId : getPayslipHeader.id
        },
        orderBy: {
            sequence: 'asc',
        }
    })

    const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'Edit Employee Salary', getPayslipHeader, listOfPayslipDetails, cutOfPeriodUuid: getCutOffPeriodId.uuid }
    res.render('pages/edit-salary/edit-details', param)
}

const updateSalaryDetails = async (req, res) => {
    try {
        // Periode yang sudah closing tidak boleh diubah.
        const headerUuid = req.body.uuid;
        const header = await prisma.payslipHeader.findFirst({
            where: { uuid: headerUuid },
            select: { cutOffPeriodId: true },
        });
        if (header) {
            const period = await prisma.cutOffPeriod.findFirst({
                where: { id: header.cutOffPeriodId },
                select: { isClosing: true },
            });
            if (period && period.isClosing === 1) {
                req.flash('error', 'Periode sudah di-closing dan tidak bisa diubah');
                return res.redirect('back');
            }
        }

        const updatedBy = req.user.fullName;
        const totalRow = req.body.amt.length;

        for(let i = 0; i < totalRow; i++) {
            uuid = req.body.uuid_details[i];
            isUpdate = req.body.is_update[i];
            amount = req.body.amt[i];

            if (isUpdate == 1) {
                const updateSalary = await prisma.payslipDetails.update({
                    data: {
                        amount: Number(formatNumberWithoutDelimiter(amount)),
                        updatedBy,
                    },
                    where: {
                        uuid: uuid,
                    }    
                })    
            }
        }    
        req.flash("success", "Update salary successfully !!!")
    } catch (err) {
        console.error('updateSalaryDetails:', err.message);
        req.flash('error', err.message);
    }
    res.redirect('back');
}

module.exports = {
    showIndex,
    showEditSalary,
    showEditSalaryDetail,
    updateSalaryDetails,
}