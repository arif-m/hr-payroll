const prisma = require('../libs/prisma');

const { listRolesPermission } = require('../helper/roles-permission');
const moment = require('moment');
const generalHelper = require('../helper/general');
const path = require('path');
const fs = require('fs');

const listOfMedicalReimbursement = async (req, res) => {        
    const userInfo = req.user;
    const uuid = req.user.uuid;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search) {
        where = { AND: [
                    {
                        OR: [
                            {
                                reimbursementDescription: {
                                    contains: search                    
                                },        
                            },
                            { reimbursementCategory: {
                                contains: search
                            }}
                        ]
                    },
                    { employeeId: Number(userInfo.id) }
                ]
            }
    } else {
        where = { employeeId: Number(userInfo.id) }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.requestMedicalReimbursementHeader.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataMedicalReimbursement = await prisma.requestMedicalReimbursementHeader.findMany({
        skip: skip,
        take: limit,
        where,
        orderBy: {
            createdAt: 'desc',
        }
    })

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfMedicalReimbursement = { meta : metaDataRoles, data: getDataMedicalReimbursement};

    let param = { user: userInfo, pageTitle: "Request Medical Reimbursement", search, moment, getRoles, listOfMedicalReimbursement, uuid, generalHelper };
    res.render('pages/medical-reimbursement/index', param);

}

const requestMedicalReimbursement = async (req, res) => {
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

    const listOfMedicalReimbursementCategory = await prisma.medicalReimbursementCategory.findMany({
        where: {
            isActive: 1,
        },
        select : {
            id: true,
            description: true,
        }
    })

    let param = { user: userInfo, pageTitle: "New Request Medical Reimbursement", getRoles, listOfMedicalReimbursementCategory, employeeData, generalHelper };
    res.render('pages/medical-reimbursement/add-request', param);
}

const processRequestMedicalReimbursement = async (req, res) => {
    const { description_header, category, category_description, total, id, business_unit_id, business_unit_name, division_id, division_name, jobtitle_id, jobtitle_name } = req.body;
    const userInfo = req.user;
    const checkDataDetails = req.body.amount;

    if (checkDataDetails === undefined) {
        req.flash('error', 'You have to fill data details !!!')
        req.flash('description_header', description_header);
        req.flash('category', category);
        req.flash('category_description', category_description);
        res.redirect('back');
        return;
    }

    const getDataUser = await prisma.users.findFirst({
        where: {
            uuid: userInfo.uuid,
        },
        select: {
            employmentStatus: true,
        }
    })

    if (getDataUser.employmentStatus != 'Permanent') {
        req.flash('error', 'Employement status is ' + getDataUser.employmentStatus + ', you cannot submit request medical reimbursement !!!')
        req.flash('description_header', description_header);
        req.flash('category', category);
        req.flash('category_description', category_description);
        res.redirect('back');
        return;
    }

    if (req.body.balance == 0) {
        req.flash('error', 'Your balance is ' + req.body.balance + ', you cannot submit request medical reimbursement !!!')
        req.flash('description_header', description_header);
        req.flash('category', category);
        req.flash('category_description', category_description);
        res.redirect('back');
        return;
    }
    
    const getMedicalReimbursementBalanceOfEmployee = await prisma.users.findFirst({
        where: {
            id: userInfo.id,
        },
        select: {
            medicalReimbursementBudget: true,
        }
    }) 

    if (getMedicalReimbursementBalanceOfEmployee.medicalReimbursementBudget == 0) {
        req.flash('error', 'Your balance is ' + getMedicalReimbursementBalanceOfEmployee.medicalReimbursementBudget + ', you cannot submit request medical reimbursement !!!')
        req.flash('description_header', description_header);
        req.flash('category', category);
        req.flash('category_description', category_description);
        res.redirect('back');
        return;
    }

    if(req.files === null) {
        req.flash('error', 'No file uploaded');
        req.flash('description_header', description_header);
        req.flash('category', category);
        req.flash('category_description', category_description);
        res.redirect('back');
        return res.status(400).json({msg: "No file uploaded"});
    }
    const file = req.files.image;
    const fileSize = file.data.length;
    const ext = path.extname(file.name);
    const fileName = file.md5 + ext;
    const url = `${req.protocol}://${req.get("host")}/images/medical/${fileName}`;
    const allowedType = ['.png','.jpg','.jpeg'];

    if(!allowedType.includes(ext.toLowerCase())) {
        req.flash('error', 'Invalid images file');
        req.flash('description_header', description_header);
        req.flash('category', category);
        req.flash('category_description', category_description);
        res.redirect('back');
        return res.status(422).json({msg: "Invalid images file"});
    }
    if(fileSize > 3500000) {
        req.flash('error', 'Image must be less than 3.5 MB');
        req.flash('description_header', description_header);
        req.flash('category', category);
        req.flash('category_description', category_description);
        res.redirect('back');
        return res.status(422).json({msg: "Image must be less than 3.5 MB"});
    }

    const pathTo = `public/images/medical/${fileName}.${ext}`;
    if (! fs.existsSync(pathTo)) {
        // if not exist folder create folder
        const destination = path.dirname(pathTo);
        fs.mkdirSync(destination, { recursive: true });
    }

    file.mv(`./public/images/medical/${fileName}`, async(err) => {
        if(err) {
            req.flash('error', err.message);
            res.redirect('back');

            return res.status(500).json({msg: err.message});
        }
        try {
            const createdBy = req.user.fullName;
            const updatedBy = req.user.fullName;
        
            const insertMedicalReimbursementHeader = await prisma.requestMedicalReimbursementHeader.create({
                data: {
                    reimbursementDescription: description_header,
                    totalReimbursement: Number(total),
                    totalReimbursementApproved: 0,
                    employeeId: Number(id),
                    reimbursementCategoryId: Number(category),
                    reimbursementCategory: category_description,
                    totalReimbursement: Number(total),
                    divisionId: Number(division_id),
                    divisionName: division_name,
                    businessUnitId: Number(business_unit_id),
                    businessUnitName: business_unit_name,
                    jobTitleId: Number(jobtitle_id),
                    jobTitleName: jobtitle_name,
                    image: url,
                    createdBy,
                    updatedBy,
                }
            })
        
            if (typeof checkDataDetails != "object") {
                description = req.body.description;
                amount = req.body.amount;
                const insertMedicalReimbursementDetails = await prisma.requestMedicalReimbursementDetails.create({
                    data: {
                        requestMedicalReimbursementHeaderId: Number(insertMedicalReimbursementHeader.id),
                        detailsDescription: description,
                        amount: Number(amount),
                    }
                })   
            } else {
                for(var i = 0; i < checkDataDetails.length; ++i) {
                    description = req.body.description[i];
                    amount = req.body.amount[i];
                    const insertMedicalReimbursementDetails = await prisma.requestMedicalReimbursementDetails.create({
                        data: {
                            requestMedicalReimbursementHeaderId: Number(insertMedicalReimbursementHeader.id),
                            detailsDescription: description,
                            amount: Number(amount),
                        }
                    })        
                }    
            } 
            req.flash('success', 'Request medical reimbursement successfully')
            res.redirect('/medical-reimbursement-request');
        } catch (error) {
            console.log(error.message);
            req.flash('error', error.message);
            res.redirect('back');
        }
    })

    return
/*
    const { description_header, category, category_description, total, id, business_unit_id, business_unit_name, division_id, division_name, jobtitle_id, jobtitle_name } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const insertMedicalReimbursementHeader = await prisma.requestMedicalReimbursementHeader.create({
        data: {
            reimbursementDescription: description_header,
            totalReimbursement: Number(total),
            totalReimbursementApproved: 0,
            employeeId: Number(id),
            reimbursementCategoryId: Number(category),
            reimbursementCategory: category_description,
            totalReimbursement: Number(total),
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

    if (typeof checkDataDetails != "object") {
        description = req.body.description;
        amount = req.body.amount;
        const insertMedicalReimbursementDetails = await prisma.requestMedicalReimbursementDetails.create({
            data: {
                requestMedicalReimbursementHeaderId: Number(insertMedicalReimbursementHeader.id),
                detailsDescription: description,
                amount: Number(amount),
            }
        })   
    } else {
        for(var i = 0; i < checkDataDetails.length; ++i) {
            description = req.body.description[i];
            amount = req.body.amount[i];
            const insertMedicalReimbursementDetails = await prisma.requestMedicalReimbursementDetails.create({
                data: {
                    requestMedicalReimbursementHeaderId: Number(insertMedicalReimbursementHeader.id),
                    detailsDescription: description,
                    amount: Number(amount),
                }
            })        
        }    
    } 
    req.flash('success', 'Request medical reimbursement successfully')
    res.redirect('/medical-reimbursement-request');

    */
}

const showDetailRequestMedicalReimbursement = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const uuid = req.params.uuid;
    
    const getDataRequestMedicalReimbursementHeader = await prisma.requestMedicalReimbursementHeader.findFirst({
        where: {
            uuid: uuid,
        }
    })

    const employeeId = getDataRequestMedicalReimbursementHeader.employeeId;
    const employeeData = await prisma.users.findUnique({
        where: {
            id: employeeId,
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

    const getDataRequestMedicalReimbursementDetails = await prisma.requestMedicalReimbursementDetails.findMany({
        where: {
            requestMedicalReimbursementHeaderId: getDataRequestMedicalReimbursementHeader.id,
        },
        select: {
            detailsDescription: true,
            amount: true,
        }
    })

    let param = { user: userInfo, pageTitle: "Detail of Request Medical Reimbursement", moment, getRoles, employeeData, getDataRequestMedicalReimbursementHeader, getDataRequestMedicalReimbursementDetails };
    res.render('pages/medical-reimbursement/show-request', param);
}

const listingApproveMedicalReimbursementBySupervisor = async (req, res) => {
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
                            reimbursementDescription: {
                                contains: search                    
                            },        
                        },
                        { reimbursementCategory: {
                            contains: search
                        }}
                    ]
                },
                { employeeId: Number(userInfo.id) }
            ]
        }
    } else {
        where = { employeeId: Number(userInfo.id) }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id};`
    let getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id} LIMIT ${limit};`
    if (skip > 0)
        getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id} LIMIT ${skip}, ${limit};`

    if (search) {
        searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id} AND (reimbursementCategory LIKE ${searching} OR reimbursementDescription LIKE ${searching}) LIMIT ${limit};`
        getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id} AND (reimbursementCategory LIKE ${searching} OR reimbursementDescription  LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 0 AND supervisor = ${req.user.id} AND (reimbursementCategory LIKE ${searching} OR reimbursementDescription  LIKE ${searching}) LIMIT ${skip}, ${limit};`
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

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfMedicalReimbursement = { meta : metaDataRoles, data: getDataMedicalReimbursement};

    let param = { user: userInfo, pageTitle: "Approve / Denied Request Medical Reimbursement by Supervisor", search, moment, getRoles, listOfMedicalReimbursement, generalHelper };
    res.render('pages/medical-reimbursement/listing-approve-request-by-supervisor', param);
}

const approveMedicalReimbursementBySupervisor = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const uuid = req.params.uuid;
    
    const getDataRequestMedicalReimbursementHeader = await prisma.requestMedicalReimbursementHeader.findFirst({
        where: {
            uuid: uuid,
        }
    })

    const employeeId = getDataRequestMedicalReimbursementHeader.employeeId;
    const employeeData = await prisma.users.findUnique({
        where: {
            id: employeeId,
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

    const getDataRequestMedicalReimbursementDetails = await prisma.requestMedicalReimbursementDetails.findMany({
        where: {
            requestMedicalReimbursementHeaderId: getDataRequestMedicalReimbursementHeader.id,
        }
    })

    let param = { user: userInfo, pageTitle: "Approve / Denied Request Medical Reimbursement by Supervisor", moment, getRoles, employeeData, getDataRequestMedicalReimbursementHeader, getDataRequestMedicalReimbursementDetails, generalHelper };
    res.render('pages/medical-reimbursement/approve-request-by-supervisor', param);
}

const processApproveMedicalReimbursementBySupervisor = async (req, res) => {
    const { uuid, is_approved, approved_date, comments } = req.body;
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
    const updatedBy = req.user.fullName;

    const updateData = await prisma.requestMedicalReimbursementHeader.update({
        where: {
            uuid: uuid,
        },
        data: {
            isApproved: Number(is_approved),
            approvedBySupervisorDate: moment.utc(approvedDate).toDate(),
            commentsBySupervisor: comments,
            updatedBy,
        }
    })

    if (updateData) {
        req.flash('success', 'Approve request medical reimbursement by supervisor successfully !!');
        res.redirect('/medical-reimbursement-approved-by-supervisor/listing');    
    } else {
        req.flash('error', 'Approve request medical reimbursement by supervisor failed !!');
        res.redirect('back');    
    }
}

const listingApproveMedicalReimbursementByHR = async (req, res) => {
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
                            reimbursementDescription: {
                                contains: search                    
                            },        
                        },
                        { reimbursementCategory: {
                            contains: search
                        }}
                    ]
                },
                { employeeId: Number(userInfo.id) }
            ]
        }
    } else {
        where = { employeeId: Number(userInfo.id) }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 1 AND isApprovedByHR = 0 AND supervisor = ${req.user.id};`
    let getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 1 AND isApprovedByHR = 0 AND supervisor = ${req.user.id} LIMIT ${limit};`
    if (skip > 0)
        getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 1 AND isApprovedByHR = 0 AND supervisor = ${req.user.id} LIMIT ${limit}, ${skip};`

    if (search) {
        searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 1 AND isApprovedByHR = 0 AND supervisor = ${req.user.id} AND (reimbursementCategory LIKE ${searching} OR reimbursementDescription LIKE ${searching}) LIMIT ${limit};`
        getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 1 AND isApprovedByHR = 0 AND supervisor = ${req.user.id} AND (reimbursementCategory LIKE ${searching} OR reimbursementDescription  LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApproved = 1 AND isApprovedByHR = 0 AND supervisor = ${req.user.id} AND (reimbursementCategory LIKE ${searching} OR reimbursementDescription  LIKE ${searching}) LIMIT  ${skip}, ${limit};`
    }

    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfMedicalReimbursement = { meta : metaDataRoles, data: getDataMedicalReimbursement};

    let param = { user: userInfo, pageTitle: "Approve / Denied Request Medical Reimbursement by HR", search, moment, getRoles, listOfMedicalReimbursement, generalHelper };
    res.render('pages/medical-reimbursement/listing-approve-request-by-hr', param);
}

const approveMedicalReimbursementByHR = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const uuid = req.params.uuid;

    const getDataRequestMedicalReimbursementHeader = await prisma.requestMedicalReimbursementHeader.findFirst({
        where: {
            uuid: uuid,
        }
    })
    
    const employeeId = getDataRequestMedicalReimbursementHeader.employeeId;
    const employeeData = await prisma.users.findUnique({
        where: {
            id: employeeId,
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

    const getDataRequestMedicalReimbursementDetails = await prisma.requestMedicalReimbursementDetails.findMany({
        where: {
            requestMedicalReimbursementHeaderId: getDataRequestMedicalReimbursementHeader.id,
        }
    })

    let param = { user: userInfo, pageTitle: "Approve / Denied Request Medical Reimbursement by HR", moment, getRoles, employeeData, getDataRequestMedicalReimbursementHeader, getDataRequestMedicalReimbursementDetails, generalHelper };
    res.render('pages/medical-reimbursement/approve-request-by-hr', param);
}

const processApproveMedicalReimbursementByHR = async (req, res) => {
    const { uuid, is_approved, approved_date, comments } = req.body;
    let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
    const updatedBy = req.user.fullName;

    const updateData = await prisma.requestMedicalReimbursementHeader.update({
        where: {
            uuid: uuid,
        },
        data: {
            isApprovedByHR: Number(is_approved),
            approvedByHRDate: moment.utc(approvedDate).toDate(),
            commentsByHR: comments,
            updatedBy,
        }
    })

    if (updateData) {
        req.flash('success', 'Approve request medical reimbursement by HR successfully !!');
        res.redirect('/medical-reimbursement-approved-by-hr/listing');    
    } else {
        req.flash('error', 'Approve request medical reimbursement by HR failed !!');
        res.redirect('back');    
    }
}

const listingApproveMedicalReimbursementByFinance = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const query = req.query;
    let search = query.search;
    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApprovedByHR = 1 AND isApprovedByFinance = 0 AND supervisor = ${req.user.id};`
    let getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApprovedByHR = 1 AND isApprovedByFinance = 0 AND supervisor = ${req.user.id} LIMIT ${limit};`
    if (skip > 0)
        getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApprovedByHR = 0 AND isApprovedByFinance = 0 AND supervisor = ${req.user.id} LIMIT ${limit}, ${skip};`

    if (search) {
        searching = `%${search}%`;
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApprovedByHR = 0 AND isApprovedByFinance = 0 AND supervisor = ${req.user.id} AND (reimbursementCategory LIKE ${searching} OR reimbursementDescription LIKE ${searching}) LIMIT ${limit};`
        getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE AND isApprovedByHR = 1 AND isApprovedByFinance = 0 AND supervisor = ${req.user.id} AND (reimbursementCategory LIKE ${searching} OR reimbursementDescription  LIKE ${searching}) LIMIT ${limit};`
        if (skip > 0)
            getDataMedicalReimbursement = await prisma.$queryRaw`SELECT requestMedicalReimbursementHeader.id, requestMedicalReimbursementHeader.uuid, reimbursementCategory, reimbursementDescription, createdAt, totalReimbursement, isApproved, isApprovedByHR, isApprovedByFinance, requestMedicalReimbursementHeader.employeeId, fullName, businessUnitName, jobTitleName, divisionName, medicalReimbursementBudget, medicalReimbursementTaken FROM requestMedicalReimbursementHeader JOIN users ON requestMedicalReimbursementHeader.employeeId = users.id WHERE isApprovedByHR = 1 AND isApprovedByFinance = 0 AND supervisor = ${req.user.id} AND (reimbursementCategory LIKE ${searching} OR reimbursementDescription  LIKE ${searching}) LIMIT ${skip}, ${limit};`
    }

    let totalPage
    let totalRecords
    totalCount.forEach((x) => {
        totalRecords = x.total;
        totalPage = Math.ceil(Number(x.total) / limit);
    })
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfMedicalReimbursement = { meta : metaDataRoles, data: getDataMedicalReimbursement};

    let param = { user: userInfo, pageTitle: "Approve / Denied Request Medical Reimbursement by Finance", search, moment, getRoles, listOfMedicalReimbursement, generalHelper };
    res.render('pages/medical-reimbursement/listing-approve-request-by-finance', param);
}

const approveMedicalReimbursementByFinance = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const uuid = req.params.uuid;
    
    const getDataRequestMedicalReimbursementHeader = await prisma.requestMedicalReimbursementHeader.findFirst({
        where: {
            uuid: uuid,
        }
    })

    const employeeId = getDataRequestMedicalReimbursementHeader.employeeId;
    const employeeData = await prisma.users.findUnique({
        where: {
            id: employeeId,
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

    const getDataRequestMedicalReimbursementDetails = await prisma.requestMedicalReimbursementDetails.findMany({
        where: {
            requestMedicalReimbursementHeaderId: getDataRequestMedicalReimbursementHeader.id,
        }
    })

    let param = { user: userInfo, pageTitle: "Approve / Denied Request Medical Reimbursement by Finance", moment, getRoles, employeeData, getDataRequestMedicalReimbursementHeader, getDataRequestMedicalReimbursementDetails, generalHelper };
    res.render('pages/medical-reimbursement/approve-request-by-finance', param);
}

const processApproveMedicalReimbursementByFinance = async (req, res) => {
    try {
        const { uuid, employee_id, total_approved, is_approved, approved_date, comments } = req.body;
        let approvedDate = approved_date.split("-")[2] + '-' + approved_date.split("-")[1] + '-' + approved_date.split("-")[0];
        const updatedBy = req.user.fullName;
    
        const getDataSetupSystem = await prisma.setupSystem.findFirst({
            select: {
                isActivatePercentageMedicalReimbursement: true,
            }
        })
    
        const getDataUser = await prisma.users.findFirst({
            where: {
                id: Number(employee_id),
            },
            select: {
                medicalReimbursementBudget: true,
            }
        })

        let totalReimbursementBudget = getDataUser.medicalReimbursementBudget;
        let totalReimbursementThisYear = 0;    
        const thisYear = moment().format('Y');;
        let startPeriod = thisYear + '-01-' + '01';
        startPeriod = moment.utc(startPeriod).toDate();
        let endPeriod = thisYear + '-12-' + '31';
        endPeriod = moment.utc(endPeriod).toDate();        
        if (getDataSetupSystem.isActivatePercentageMedicalReimbursement == 1) {
            const getDataMedicalReimbursementHeader = await prisma.requestMedicalReimbursementHeader.findFirst({
                where: {
                    uuid: uuid,
                },
                select: {
                    reimbursementCategoryId: true,
                    reimbursementCategory: true,
                }
            })
            if (getDataMedicalReimbursementHeader) {
                const getDataReimbursementCategory = await prisma.medicalReimbursementCategory.findFirst({
                    where: {
                        id: Number(getDataMedicalReimbursementHeader.reimbursementCategoryId)
                    }
                })
                let percentage = 100;
                if (getDataReimbursementCategory.percentage > 0)
                    percentage = getDataReimbursementCategory.percentage;
                totalReimbursementBudget = (percentage/100) * totalReimbursementBudget;
            }

            getDataTotalMedicalReimbursementThisYear = await prisma.requestMedicalReimbursementHeader.groupBy({
                where: {
                    reimbursementCategoryId: Number(getDataMedicalReimbursementHeader.reimbursementCategoryId),
                    isApprovedByFinance: 1,
                    employeeId: Number(employee_id),
                    createdAt : {
                        lte: endPeriod,
                        gte: startPeriod,
                    } 
                },
                by: ['reimbursementCategoryId'],
                _sum: {
                    totalReimbursementApproved: true,
                },
            })
            getDataTotalMedicalReimbursementThisYear.forEach((data) => {
                totalReimbursementThisYear = data._sum.totalReimbursementApproved;
            })    
        } else {
            let getDataTotalMedicalReimbursementThisYear = await prisma.requestMedicalReimbursementHeader.aggregate({
                where: {
                    isApprovedByFinance: 1,
                    employeeId: Number(employee_id),
                    createdAt : {
                        lte: endPeriod,
                        gte: startPeriod,
                    } 
                },
                //by: ['isApprovedByFinance'],
                _sum: {
                    totalReimbursementApproved: true,
                },
            })
            if (getDataTotalMedicalReimbursementThisYear._sum.totalReimbursement == undefined){
                totalReimbursementThisYear = 0;
            }
            else {
                totalReimbursementThisYear = getDataTotalMedicalReimbursementThisYear._sum.totalReimbursement;
            }
        }
    
        let totalReimbursementRemaining = totalReimbursementBudget - totalReimbursementThisYear; 
        if (totalReimbursementRemaining >= total_approved) {
            if (is_approved == 1) {
                const updateDataUsers = await prisma.users.update({
                    where: {
                        id: Number(employee_id),
                    },
                    data: {
                        medicalReimbursementRemaining: {
                            decrement: Number(total_approved),
                        },
                        medicalReimbursementTaken: {
                            increment: Number(total_approved),
                        }
                    }
                })        
            }
        
            const updateDataReimbursementHeader = await prisma.requestMedicalReimbursementHeader.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    isApprovedByFinance: Number(is_approved),
                    totalReimbursementApproved: Number(total_approved),
                    approvedByFinanceDate: moment.utc(approvedDate).toDate(),
                    commentsByFinance: comments,
                    updatedBy,
                }
            })
            req.flash('success', 'Approve request medical reimbursement by Finance successfully !!');
            res.redirect('/medical-reimbursement-approved-by-fa/listing');              
        } else {
            req.flash('error', 'Total approved of medical reimbursement is ' + total_approved + ' more than ' + totalReimbursementRemaining );
            res.redirect('back');    
        }
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('back');        
    }
}

const showMedicalReimbursementHistory = async (req, res) => {
    try {
        const userInfo = req.user;
        const getRoles = await listRolesPermission(userInfo.roleUuid);
        const { uuid } = req.params;
        const thisYear = moment().format('Y');;
        let startPeriod = thisYear + '-01-' + '01';
        startPeriod = moment.utc(startPeriod).toDate();
        let endPeriod = thisYear + '-12-' + '31';
        endPeriod = moment.utc(endPeriod).toDate();

        const getDataEmployee = await prisma.requestMedicalReimbursementHeader.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                employeeId: true,
                employeeInfo: {
                    select: {
                        medicalReimbursementBudget: true,
                        medicalReimbursementTaken: true,   
                        medicalReimbursementRemaining: true,     
                    }
                }
            }
        })

        if (getDataEmployee) {
            const query = req.query;
            let search = query.search;
            where = {};
            if (query.search) {
                where = { AND: [
                            { createdAt : {
                                    lte: endPeriod,
                                    gte: startPeriod,
                                } 
                            },
                            { employeeId: getDataEmployee.employeeId },
                            { isApprovedByFinance: 1 }
                        ]
                    }
            } else {
                where = { AND: [
                        { isApprovedByFinance: 1 },
                        { createdAt : {
                            lte: endPeriod,
                            gte: startPeriod,
                            } 
                        },
                    ]
                }
            }

            const page = parseInt(query.page) || 0;
            const limit = parseInt(query.limit) || 10;
            const skip = page * limit;

            const totalCount = await prisma.requestMedicalReimbursementHeader.count({ where, });
            const totalPage = Math.ceil(totalCount / limit);
            const currentPage = page || 0;

            const getDataMedicalReimbursement = await prisma.requestMedicalReimbursementHeader.findMany({
                skip: skip,
                take: limit,
                where,
                select: {
                    reimbursementCategory: true,
                    createdAt: true,
                    totalReimbursement: true,
                    totalReimbursementApproved: true,
                },
                orderBy: {
                    reimbursementCategory: 'desc',
                }
            })

            const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount};
            const listOfMedicalReimbursement = { meta : metaDataRoles, data: getDataMedicalReimbursement};
            
            let param = { user: userInfo, pageTitle: "Show History of Medical Reimbursement", moment, search, getRoles, getDataEmployee, listOfHistory: listOfMedicalReimbursement, getDataEmployee, uuid };
            res.render('pages/medical-reimbursement/history', param);
        }            
    } catch (error) {
        console.log(error.message);
    }
}

const showRequestMedicalReimbursementHistory = async (req, res) => {
    try {
        const userInfo = req.user;
        const getRoles = await listRolesPermission(userInfo.roleUuid);
        const { uuid } = req.params;
        const thisYear = moment().format('Y');;
        let startPeriod = thisYear + '-01-' + '01';
        startPeriod = moment.utc(startPeriod).toDate();
        let endPeriod = thisYear + '-12-' + '31';
        endPeriod = moment.utc(endPeriod).toDate();

        const getDataEmployee = await prisma.users.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                employeeId: true,
                medicalReimbursementBudget: true,
                medicalReimbursementTaken: true,   
                medicalReimbursementRemaining: true,     
            }
        })

        if (getDataEmployee) {
            const query = req.query;
            let search = query.search;
            where = {};
            if (query.search) {
                where = { AND: [
                            { createdAt : {
                                    lte: endPeriod,
                                    gte: startPeriod,
                                } 
                            },
                            { employeeId: getDataEmployee.employeeId },
                            { isApprovedByFinance: 1 }
                        ]
                    }
            } else {
                where = { AND: [
                        { isApprovedByFinance: 1 },
                        { createdAt : {
                            lte: endPeriod,
                            gte: startPeriod,
                            } 
                        },
                    ]
                }
            }

            const page = parseInt(query.page) || 0;
            const limit = parseInt(query.limit) || 10;
            const skip = page * limit;

            const totalCount = await prisma.requestMedicalReimbursementHeader.count({ where, });
            const totalPage = Math.ceil(totalCount / limit);
            const currentPage = page || 0;

            const getDataMedicalReimbursement = await prisma.requestMedicalReimbursementHeader.findMany({
                skip: skip,
                take: limit,
                where,
                select: {
                    reimbursementCategory: true,
                    createdAt: true,
                    totalReimbursement: true,
                    totalReimbursementApproved: true,
                },
                orderBy: {
                    reimbursementCategory: 'desc',
                }
            })

            const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount};
            const listOfMedicalReimbursement = { meta : metaDataRoles, data: getDataMedicalReimbursement};
            
            let param = { user: userInfo, pageTitle: "Show History of Medical Reimbursement", moment, search, getRoles, getDataEmployee, listOfHistory: listOfMedicalReimbursement, getDataEmployee, uuid };
            res.render('pages/medical-reimbursement/history2', param);
        }            
    } catch (error) {
        console.log(error.message);
    }
}

const getBalanceOfMedicalReibursementByCategoryId = async (req, res) => {
    try {
        const category_id = req.query.category_id;
        const uuid = req.query.uuid;

        const getUserId = await prisma.users.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                id: true,
            }
        })
        id = getUserId.id;

        const getDataSetupSystem = await prisma.setupSystem.findFirst({
            select: {
                isActivatePercentageMedicalReimbursement: true,
            }
        })

        const thisYear = moment().format('Y');;
        let startPeriod = thisYear + '-01-' + '01';
        startPeriod = moment.utc(startPeriod).toDate();
        let endPeriod = thisYear + '-12-' + '31';
        endPeriod = moment.utc(endPeriod).toDate();     
        let totalReimbursementThisYear = 0;  
        if (getDataSetupSystem.isActivatePercentageMedicalReimbursement == 1) { 
            const getDataTotalMedicalReimbursementByCategoryThisYear = await prisma.requestMedicalReimbursementHeader.groupBy({
                where: {
                    reimbursementCategoryId: Number(category_id),
                    isApprovedByFinance: 1,
                    employeeId: Number(id),
                    createdAt : {
                        lte: endPeriod,
                        gte: startPeriod,
                    } 
                },
                by: ['reimbursementCategoryId'],
                _sum: {
                    totalReimbursementApproved: true,
                },
            })
            getDataTotalMedicalReimbursementByCategoryThisYear.forEach((data) => {
                totalReimbursementThisYear = data._sum.totalReimbursementApproved;
            })   
        } else {
            const getDataTotalMedicalReimbursementThisYear = await prisma.requestMedicalReimbursementHeader.aggregate({
                where: {
                    isApprovedByFinance: 1,
                    employeeId: Number(id),
                    createdAt : {
                        lte: endPeriod,
                        gte: startPeriod,
                    } 
                },
                _sum: {
                    totalReimbursementApproved: true,
                },
            })       
            totalReimbursementThisYear = getDataTotalMedicalReimbursementThisYear._sum.totalReimbursementApproved;
        }
        
        const getDataReimbursementBudget = await prisma.users.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                medicalReimbursementBudget: true,
            }
        })
    
        const getDataPercentageOfMedicalReimbursementCategory = await prisma.medicalReimbursementCategory.findFirst({
            where: {
                id: Number(category_id),
            },
            select: {
                percentage: true,
            }
        })
    
        let percentage = 100;
        if (getDataPercentageOfMedicalReimbursementCategory.percentage > 0) 
            percentage = getDataPercentageOfMedicalReimbursementCategory.percentage;
        const medicalReimbursementBudget = getDataReimbursementBudget.medicalReimbursementBudget;
        const amountOfMedicalReimbursementByCategory = medicalReimbursementBudget * percentage / 100;
        let medicalReimbursementRemaing = 0;
        if (getDataSetupSystem.isActivatePercentageMedicalReimbursement == 1) {
            medicalReimbursementRemaing = amountOfMedicalReimbursementByCategory - totalReimbursementThisYear;
        } else {
            medicalReimbursementRemaing = medicalReimbursementBudget - totalReimbursementThisYear;
        }

        res.status(200).send({
            status: true,
            statusCode: 200,
            message: 'Get data detail successfully',
            data: medicalReimbursementRemaing
        });    
   } catch (error) {
        console.log(error.message)
        res.status(500).send({
            status: true,
            statusCode: 500,
           message: error.message,
           data: []
        });
    }
}

module.exports = {
    listOfMedicalReimbursement,
    requestMedicalReimbursement,
    processRequestMedicalReimbursement,
    showDetailRequestMedicalReimbursement,
    listingApproveMedicalReimbursementBySupervisor,
    approveMedicalReimbursementBySupervisor,
    processApproveMedicalReimbursementBySupervisor,
    listingApproveMedicalReimbursementByHR,
    approveMedicalReimbursementByHR,
    processApproveMedicalReimbursementByHR,
    listingApproveMedicalReimbursementByFinance,
    approveMedicalReimbursementByFinance,
    processApproveMedicalReimbursementByFinance,
    showMedicalReimbursementHistory,
    showRequestMedicalReimbursementHistory,
    getBalanceOfMedicalReibursementByCategoryId,
}