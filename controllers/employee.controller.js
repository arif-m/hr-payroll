var logger = require('../libs/logger'),
    csrf = require('../libs/csrf'),
    csrfProtection = csrf({
      cookie: true
    });

var bcrypt = require('bcrypt');
const { findOverlaps, buildOverlapMessage } = require('../libs/leave/overlap');

const prisma = require('../libs/prisma');

const moment = require('moment');
const { listRolesPermission } = require('../helper/roles-permission');
const employmentHistory = require('../libs/payroll/employment-history');
const { getTotalDayOfCalendar } = require('../helper/get-total-calendar');
const path = require('path');

const fs = require('fs');
const crypto = require('crypto');
const { listOfHolidaysCalendar } = require('../helper/calendar');

const showDataEmployeeJson = async (req, res) => {
    try {        
        const query = req.query;
        let search = query.search;
        let where = {};
        if (query.search){
            where = { 
                    divisionId : Number(search),
                    status: 'Active',
                }
        }
        
        const getDataEmployee = await prisma.users.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                email: true,
                division: {
                    select: {
                      id: true,
                      divisionName: true,
                    },
                },
            }
        })
        logger.debug(getDataEmployee.length);
        if(getDataEmployee.length > 0) {
            res.status(200).send({
                status: true,
                statusCode: 200,
                message: 'Get data successfully',
                data: getDataEmployee
            });
        } else {
            res.status(404).send({
                status: false,
                statusCode: 404,
                message: 'Get Data unsuccessfully',
                data: []
            });
        }
    } catch (err) {
        logger.error(err.message);
        res.status(404).send({
            status: false,
            statusCode: 404,
            message: err.message,
            data: []
        });
    }
}

const showDataEmployeeJsonbyStatus = async (req, res) => {
    try {        
        const query = req.query;
        let search = query.search;
        let where = { roleId : 1,
            status: 'Active',
        };
        
        const getDataEmployee = await prisma.users.groupBy({
            where,
            by: ['employmentStatus'],
            _count: {
                employmentStatus: true,
            },
        })
        if(getDataEmployee.length > 0) {
            res.status(200).send({
                status: true,
                statusCode: 200,
                message: 'Get data successfully',
                data: getDataEmployee
            });
        } else {
            res.status(404).send({
                status: false,
                statusCode: 404,
                message: 'Get Data unsuccessfully',
                data: []
            });
        }
    } catch (err) {
        logger.error(err.message);
        res.status(404).send({
            status: false,
            statusCode: 404,
            message: err.message,
            data: []
        });
    }
}

const listEmployee = async (req, res) => {
    const query = req.query;
    let search = query.search;
    let where = {};
    if (query.search){
        where = { fullName : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.users.count({
        where,
    });

    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;
    
    const getDataEmployee = await prisma.users.findMany({
        skip: skip,
        take: limit,
        where,
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
        orderBy: {
            joinDate: 'desc',
        }
    });
    const metaDataEmployee = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfEmployee = { meta : metaDataEmployee, data: getDataEmployee};

    const listOfRoles = await prisma.roles.findMany({
        select: {
            id: true,
            roleName: true,
        },
    });
    const listOfDivision = await prisma.division.findMany({
        select: {
            id: true,
            divisionName: true,
        },
    });
    const listOfJobtitles = await prisma.jobTitle.findMany({
        select: {
            id: true,
            jobTitleName: true,
        },
    });
    const listOfBU = await prisma.businessUnit.findMany({
        select: {
            id: true,
            businessUnitName: true,
        }
    })

    const listOfSupervisor = await prisma.users.findMany({
        select: {
            id: true,
            fullName: true,
        },
        orderBy: {
            fullName: 'asc',
        }
    })

    const listOfPtkp = await prisma.ptkp.findMany({
        select: {
            id: true,
            code: true,
            description: true,
        },
        orderBy: {
            code: 'asc',
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let  param = { user: userInfo, getRoles: getRoles, search, pageTitle: 'Employee', moment: moment, listOfEmployee: listOfEmployee, listOfDivision: listOfDivision, listOfRoles: listOfRoles, listOfJobtitles: listOfJobtitles, listOfBU: listOfBU, listOfSupervisor: listOfSupervisor, listOfPtkp: listOfPtkp };
    res.render('pages/employee/index', param);
}

const getEmployeeDetail = async (req, res) => {
    const uuid = req.params.uuid;
    const dataEmployee = await prisma.users.findUnique({
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
            medicalReimbursementBudget: true,
            npwp: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountHolder: true,
            supervisor: true,
            ptkpId: true,
        }
    });

    const dataEmployeeDeserialize = JSON.stringify(dataEmployee, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
    );

    if(dataEmployeeDeserialize != "null"){
        res.status(200).send({
            status: true,
            statusCode: 200,
            message: 'Get data detail successfully',
            data: dataEmployeeDeserialize
        });    
    } else {
        res.status(404).send({
            status: true,
            statusCode: 404,
            message: 'Get data detail unsuccessfully',
            data: dataEmployeeDeserialize
        });    
    }
}

const createEmployee = async (req, res) => {
    const { full_name, role, join_date, email, mobile_phone, dob, place_of_birth, personal_id_type, personal_id_number, address, employment_status, business_unit, division, job_titles, basic_salary, npwp, supervisor, ptkp, medical_reimbursement } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const joinDate = join_date.split("-")[2] + '-' + join_date.split("-")[1] + '-' + join_date.split("-")[0];
    const dateOfBirth = dob.split("-")[2] + '-' + dob.split("-")[1] + '-' + dob.split("-")[0];

    let yearJoinDate = moment(joinDate).format('yyyy');
    let monthJoinDate = moment(joinDate).format('M');
    let dayJoinDate = moment(joinDate).format('D');

    if(monthJoinDate.length == 1 )
        monthJoinDate = '0' + monthJoinDate;
    if(dayJoinDate.length == 1 )
        dayJoinDate = '0' + dayJoinDate;

    const getMaxEmployeeId = await prisma.$queryRaw`SELECT MAX(RIGHT(employeeId, 3)) as MaxEmployeeId FROM users WHERE LEFT(employeeId, 4) = ${yearJoinDate} AND MID(employeeId, 5, 2) = ${monthJoinDate}`
    let MaxEmployeeId
    getMaxEmployeeId.forEach((x) => {
        MaxEmployeeId = Number(x.MaxEmployeeId) + 1;
    })

    let employeeId = Number(yearJoinDate + monthJoinDate + dayJoinDate + MaxEmployeeId);
    
    let roleId = Number(role);
    const salt = bcrypt.genSaltSync(10);//or your salt constant
    // SECURITY: password awal tidak lagi hardcoded — dari env, atau acak.
    const initialPassword = process.env.DEFAULT_NEW_EMPLOYEE_PASSWORD
        || crypto.randomBytes(8).toString('hex');
    const hashPassword = bcrypt.hashSync(initialPassword, salt);

    const insertEmployee = await prisma.users.create({
        data: {
            employeeId: employeeId,
            roleId: roleId,
            assignDate: null,
            fullName: full_name,
            joinDate: moment.utc(joinDate).toDate(),
            email: email,
            mobilePhone: mobile_phone,
            dob: moment.utc(dateOfBirth).toDate(),
            placeOfBirth: place_of_birth,
            personalIdType: personal_id_type,
            personalIdNumber: personal_id_number,
            address: address,
            employmentStatus: employment_status,
            businessUnitId: Number(business_unit),
            divisionId: Number(division),
            jobTitleId: Number(job_titles),
            basicSalary: Number(basic_salary),
            medicalReimbursementBudget: Number(medical_reimbursement),
            medicalReimbursementRemaining: Number(medical_reimbursement),
            supervisor: Number(supervisor),
            ptkpId: Number(ptkp),
            npwp: npwp,
            password: hashPassword,
            salt: salt,
            createdBy: createdBy,
            updatedBy: updatedBy
        }
    })

    if (insertEmployee){
        res.redirect('back');
    }
}

const updateEmployee = async (req, res) => {
    const { full_name, role, join_date_edit, email, mobile_phone, dob_edit, place_of_birth, personal_id_type, personal_id_number, address, employment_status, business_unit, division, job_titles, basic_salary, npwp, ptkp, medical_reimbursement, medical_reimbursement2, bank_name, bank_account_number, bank_account_holder } = req.body;
    const uuid = req.body.employee_uuid;
    const updatedBy = req.user.fullName;

    let roleId = Number(role);
    // let lokal (sebelumnya implicit global — race condition antar-request)
    const joinDate = join_date_edit.split("-")[2] + '-' + join_date_edit.split("-")[1] + '-' + join_date_edit.split("-")[0];
    const dob = dob_edit.split("-")[2] + '-' + dob_edit.split("-")[1] + '-' + dob_edit.split("-")[0];

    const medicalReimbursementRemaining = Number(medical_reimbursement) - Number(medical_reimbursement2);

    // Snapshot SEBELUM update — sumber perbandingan untuk riwayat kepegawaian.
    const beforeUser = await prisma.users.findUnique({
        where: { uuid },
        select: {
            id: true, jobTitleId: true, divisionId: true, basicSalary: true,
            ptkp: { select: { code: true } },
            jobTitle: { select: { jobTitleName: true } },
            division: { select: { divisionName: true } },
        },
    }).catch(() => null);

    const updateData = await prisma.users.update({
        where : {
            uuid: uuid
        },
        data: {
            roleId: roleId,
            fullName: full_name,
            joinDate: moment.utc(joinDate).toDate(),
            email: email,
            mobilePhone: mobile_phone,
            dob: moment.utc(dob).toDate(),
            placeOfBirth: place_of_birth,
            personalIdType: personal_id_type,
            personalIdNumber: personal_id_number,
            address: address,
            //employmentStatus: employment_status,
            businessUnitId: Number(business_unit),
            divisionId: Number(division),
            jobTitleId: Number(job_titles),
            basicSalary: Number(basic_salary),
            medicalReimbursementBudget: Number(medical_reimbursement),
            medicalReimbursementRemaining: {
                increment:  medicalReimbursementRemaining
            },
            npwp: npwp,
            bankName: (bank_name || '').trim() || null,
            bankAccountNumber: (bank_account_number || '').trim() || null,
            bankAccountHolder: (bank_account_holder || '').trim() || null,
            ptkpId: Number(ptkp),
            updatedBy: updatedBy
        }
    })

    // Riwayat kepegawaian: catat perubahan jabatan/divisi/gaji dasar/PTKP
    // (gagal pencatatan tidak boleh menggagalkan operasi utama).
    try {
        if (beforeUser) {
            const after = await employmentHistory.snapshotCurrentState(prisma, beforeUser.id);
            const changes = [];
            if (Number(job_titles) !== beforeUser.jobTitleId) {
                changes.push(`Jabatan: ${beforeUser.jobTitle?.jobTitleName || '-'} → ${after.jobTitleName || '-'}`);
            }
            if (Number(division) !== beforeUser.divisionId) {
                changes.push(`Divisi: ${beforeUser.division?.divisionName || '-'} → ${after.divisionName || '-'}`);
            }
            const oldBasic = Number(beforeUser.basicSalary || 0);
            const newBasic = Number(basic_salary) || 0;
            if (newBasic !== oldBasic) {
                changes.push(`Gaji dasar: ${oldBasic} → ${newBasic}`);
            }
            if ((after.ptkpCode || '') !== (beforeUser.ptkp?.code || '')) {
                changes.push(`PTKP: ${beforeUser.ptkp?.code || '-'} → ${after.ptkpCode || '-'}`);
            }
            if (changes.length > 0) {
                await employmentHistory.recordChange(prisma, {
                    usersId: beforeUser.id,
                    effectiveDate: new Date(),
                    changeType: employmentHistory.CHANGE_TYPES.CHANGE_DETAIL,
                    reason: changes.join('; '),
                    ...after,
                    actor: updatedBy,
                });
            }
        }
    } catch (histErr) {
        logger.error(`updateEmployee riwayat: ${histErr.message}`);
    }

    res.redirect('back');
}

const deleteEmployee = async (req, res) => {
    const uuid = req.body.employee_uuid;

    const deleteData = await prisma.users.delete({
        where : {
            uuid: uuid
        }
    })
    res.redirect('back');
}

const setInactiveEmployee = async (req, res) => {
    const uuid = req.body.employee_uuid;
    const status = 'Inactive';

    const setInactive = await prisma.users.update({
        where: {
            uuid: uuid,
        },
        data: {
            status: status,
        }
    })
    res.redirect('back');
}

const myProfileEmployee = async (req, res) => {
    const uuid = req.user.uuid;

    const employeeData = await prisma.users.findUnique({
        where: {
            uuid: uuid,
        },
        select: {
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
            image: true,
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

    let str = employeeData.fullName;
    let matches = str.match(/\b(\w)/g);
    let acronymFullName = matches.join('');
    
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles:getRoles, pageTitle: 'Employee', acronymFullName: acronymFullName, employeeData: employeeData, moment: moment};
    res.render('pages/employee/my-profile', param);
}

const updateProfileImage = async (req, res) => {
    const uuid = req.user.uuid;

    if(req.files === null) {
        req.flash('error', 'No file uploaded');
        res.redirect('back');
        return res.status(400).json({msg: "No file uploaded"});
    }
    const file = req.files.image;
    const fileSize = file.data.length;
    const ext = path.extname(file.name);
    const fileName = file.md5 + ext;
    const url = `${req.protocol}://${req.get("host")}/images/profiles/${fileName}`;
    const allowedType = ['.png','.jpg','.jpeg'];
 
    if(!allowedType.includes(ext.toLowerCase())) {
        req.flash('error', 'Invalid images file');
        res.redirect('back');
        return res.status(422).json({msg: "Invalid images file"});
    }
    if(fileSize > 3500000) {
        req.flash('error', 'Image must be less than 3.5MB');
        res.redirect('back');
        return res.status(422).json({msg: "Image must be less than 3.5 MB"});
    }

    const pathTo = `public/images/profiles/${fileName}.${ext}`;
    if (! fs.existsSync(pathTo)) {
        // if not exist folder create folder
        const destination = path.dirname(pathTo);
        fs.mkdirSync(destination, { recursive: true });
    }

    file.mv(`./public/images/profiles/${fileName}`, async(err)=>{
        if (err) { 
            req.flash('error', err.message);
            res.redirect('back');    
            return res.status(500).json({msg: err.message});
        }
        try {    
            const updateProfile = await prisma.users.update({
                where: {
                    uuid: uuid,
                },
                data: {
                    image: url,
                }
            })        
            if (updateProfile) {
                req.flash('success', 'Update profile successfully')
                res.redirect('back');
                res.status(201).json({msg: "Update profile successfully"});
            }
            req.flash('error', 'Update data failed !!!');
            res.redirect('back');
        } catch (error) {
            logger.error(error.message);
            req.flash('error', error.message);
            res.redirect('back');
        }
    })

}

const showPromoteEmployee = async (req, res) => {
    const query = req.query;
    let search = query.search;
    let where = {};
    if (search) {
        where = { 
            AND: [ 
                {
                    fullName: {
                        contains: search,
                    },
                }, 
                {
                    NOT: { employmentStatus: 'Permanent' }
                },
                { status: 'Active' }
            ]
        }        
    } else {
        where = {
            AND : [
                { NOT: { employmentStatus: 'Permanent' }, },
                { status: 'Active' }    
            ]     
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.users.count({
        where
    });

    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataPromoteEmployee = await prisma.users.findMany({
        skip,
        take: limit,
        where,
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
            //assignDate: true,
            fullName: true,
            joinDate: true,
            //email: true,
            //mobilePhone: true,
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
        orderBy: {
            joinDate: 'desc',
        }
    })
    const metaDataPromoteEmployee = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfPromoteEmployee = { meta : metaDataPromoteEmployee, data: getDataPromoteEmployee};

    const listOfRoles = await prisma.roles.findMany({
        select: {
            id: true,
            roleName: true,
        },
    });

    const listOfJobTitles = await prisma.jobTitle.findMany({
        select: {
            id: true,
            jobTitleName: true,
        }
    })

    const listOfDivision = await prisma.division.findMany({
        select: {
            id: true,
            divisionName: true,
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, moment, search, pageTitle: 'Promote Employee', listOfPromoteEmployee: listOfPromoteEmployee, listOfRoles, listOfJobTitles, listOfDivision };
    res.render('pages/employee/promote-employee', param);
}

const processPromoteEmployee = async (req, res) => {
    const uuid = req.body.employee_uuid;
    const employeeId = req.body.id;
    let promoteDate = req.body.promote_date;
    const employmentStatus = 'Permanent';
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;
    
    const getDataEmployee =  await prisma.users.findFirst({
        where: {
            uuid: uuid,
        },
        select: {
            joinDate: true,
        }
    })
    const getDataSetupAnnualleave = await prisma.setupAnnualLeave.findFirst({
        where: {
            name: 'init',
        }
    })

    let setupTimeOf = 1;
    let setupAdditionalTimeOff = 0;
    if (getDataSetupAnnualleave) {
        setupTimeOf = getDataSetupAnnualleave.timeOffPerMonth;
        setupAdditionalTimeOff = getDataSetupAnnualleave.additionalTimeOff;
    }
    promoteDate = promoteDate.split("-")[2] + '-' + promoteDate.split("-")[1] + '-' + promoteDate.split("-")[0];
    const yearOfPromoteDate = parseInt(moment(promoteDate).format('Y'));
    const yearOfJoinDate = parseInt(moment(getDataEmployee.joinDate).format('Y'));

    let totalTimeOf = 1;
    if (yearOfPromoteDate == yearOfJoinDate) {
        totalTimeOf = setupTimeOf * (parseInt(moment(promoteDate).format('M')) - parseInt(moment(getDataEmployee.joinDate).format('M')) + 1);
    } else {
        totalTimeOf = setupTimeOf * (12 - parseInt(moment(getDataEmployee.joinDate).format('M')) + parseInt(moment(promoteDate).format('M')) + 1);
    }
    const annualLeave = setupAdditionalTimeOff + totalTimeOf;
              
    const insertEmployeeAnnualLeave = await prisma.employeeAnnualLeave.create({
        data: {
            employeeId: Number(employeeId),
            Period: Number(promoteDate.split("-")[1]),
            day: annualLeave,
            year: Number(promoteDate.split("-")[0]),
            remarks: 'promote',
            createdBy,
            updatedBy,
        }
    })

    const updateEmploymentStatus = await prisma.users.update({
        where : {
            uuid: uuid
        },
        data: {
            employmentStatus: employmentStatus,
            annualLeaveBalance: annualLeave,
            promoteDate: moment.utc(promoteDate).toDate(),
        }
    })

    // Riwayat kepegawaian: status Probation → Permanent berlaku sejak tanggal promosi.
    try {
        const snap = await employmentHistory.snapshotCurrentState(prisma, Number(employeeId));
        await employmentHistory.recordChange(prisma, {
            usersId: Number(employeeId),
            effectiveDate: moment.utc(promoteDate).toDate(),
            changeType: employmentHistory.CHANGE_TYPES.STATUS_CHANGE,
            reason: 'Promosi Probation → Permanent',
            ...snap,
            actor: createdBy,
        });
    } catch (histErr) {
        logger.error(`processPromoteEmployee riwayat: ${histErr.message}`);
    }

    req.flash('success', 'Promote employee successfully !!');
    res.redirect('back');
}


const showSetupAnnualLeaveEmployee = async (req, res) => {
    const query = req.query;
    let search = query.search;
    let where = {};
    if (search) {
        where = { 
            AND: [ 
                {
                    fullName: {
                        contains: search,
                    },
                }, 
                {
                    NOT: { employmentStatus: 'Permanent' }
                },
                { status: 'Active' }
            ]
        }        
    } else {
        where = {
            AND : [
                { NOT: { employmentStatus: 'Permanent' }, },
                { status: 'Active' }    
            ]     
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.users.count({
        where
    });

    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataEmployeeNotPermanent = await prisma.users.findMany({
        skip,
        take: limit,
        where,
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
            annualLeaveBalance: true,
        },
        orderBy: {
            joinDate: 'desc',
        }
    })
    const metaDataEmployeeNotPermanent = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfDataEmployeeNotPermanent = { meta : metaDataEmployeeNotPermanent, data: getDataEmployeeNotPermanent};

    const listOfRoles = await prisma.roles.findMany({
        select: {
            id: true,
            roleName: true,
        },
    });

    const listOfJobTitles = await prisma.jobTitle.findMany({
        select: {
            id: true,
            jobTitleName: true,
        }
    })

    const listOfDivision = await prisma.division.findMany({
        select: {
            id: true,
            divisionName: true,
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, moment, search, pageTitle: 'Setup Annual Leave of Employee', listOfDataEmployeeNotPermanent: listOfDataEmployeeNotPermanent, listOfRoles, listOfJobTitles, listOfDivision };
    res.render('pages/employee/setup-employee-annual-leave', param);
}

const processSetupAnnualLeaveEmployee = async (req, res) => {
    const uuid = req.body.employee_uuid;
    const id = req.body.id;
    let promoteDate = moment.utc().format('YYYY-MM-DD');

    let annualLeave = req.body.days;
    const employmentStatus = 'Permanent';
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;
    const getCurrentMonth = moment().format('M');
    const getCurrentYear = moment().format('Y');

    const insertEmployeeAnnualLeave = await prisma.employeeAnnualLeave.create({
        data: {
            employeeId: Number(id),
            Period: 0,
            day: Number(annualLeave),
            year: Number(getCurrentYear),
            remarks: 'setup',
            createdBy,
            updatedBy,
        }
    })    

    const updateEmploymentStatus = await prisma.users.update({
        where : {
            uuid: uuid
        },
        data: {
            employmentStatus: employmentStatus,
            annualLeaveBalance: Number(annualLeave),
            promoteDate: moment.utc(promoteDate).toDate(),
            updatedBy,
        }
    })    
    req.flash('success', 'Setup annual leave of employee successfully !!');
    res.redirect('back');
}

const myAnnualLeave = async (req, res) => {
    const uuid = req.user.uuid;
    const employeeData = await prisma.users.findUnique({
        where: {
            uuid: uuid,
        },
        select: {
            annualLeave: true,
            annualLeaveBalance: true,
        }
    })

    const query = req.query;
    let search = query.search;
    let where = {};
    if (query.search){
        where = { leaveDescription : {
                    contains: search                    
                },
            }
    }
    if (search) {
        where = { 
            AND: [ 
                {
                    leaveDescription: {
                        contains: search,
                    },
                }, 
                { leaveTypeDescription: 'Annual Leave' },
                // SECURITY: hanya cuti milik user yang login (cegah data leak)
                { employeeId: req.user.id }
            ]
        }        
    } else {
        where = {
            leaveTypeDescription: 'Annual Leave',
            employeeId: req.user.id,
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.requestLeave.count({
        where,
    });

    const totalPage = Math.ceil(totalCount / limit);
    const currentPage = page || 0;

    const getMyRequestAnnualLeave = await prisma.requestLeave.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            leaveTypeDescription: true,
            leaveDescription: true,
            startDuration: true,
            endDuration: true,
            days: true,
            isApproved: true,
            approvedBy: true,
        }
    })
    const metaDataMyRequestAnnualLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount};
    const listOfMyRequestAnnualLeave  = { meta : metaDataMyRequestAnnualLeave, data: getMyRequestAnnualLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, moment: moment, search, pageTitle: 'My Annual Leave Balance', employeeData: employeeData, listOfMyRequestAnnualLeave: listOfMyRequestAnnualLeave};
    res.render('pages/employee/my-annual-leave', param);
}

const mySickLeave = async (req, res) => {
    const uuid = req.user.uuid;

    const employeeData = await prisma.users.findUnique({
        where: {
            uuid: uuid,
        }
    })

    const query = req.query;
    let search = query.search;
    let where = {};
    if (query.search){
        where = { leaveDescription : {
                    contains: search                    
                },
            }
    }
    if (search) {
        where = { 
            AND: [ 
                {
                    leaveDescription: {
                        contains: search,
                    },
                }, 
                { leaveType: 2 },
                // SECURITY: hanya cuti milik user yang login (cegah data leak)
                { employeeId: req.user.id }
            ]
        }        
    } else {
        where = {
            leaveType: 2,
            employeeId: req.user.id,
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.requestLeave.count({
        where,
    });

    const totalPage = Math.ceil(totalCount / limit);
    const currentPage = page || 0;

    const getMyRequestSickLeave = await prisma.requestLeave.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            leaveTypeDescription: true,
            leaveDescription: true,
            startDuration: true,
            endDuration: true,
            days: true,
            isApproved: true,
            approvedBy: true,
        }
    })
    
    const metaDataMyRequestSickLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount};
    const listOfMyRequestSickLeave  = { meta : metaDataMyRequestSickLeave, data: getMyRequestSickLeave};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, moment: moment, search, pageTitle: 'My Sick Leave Balance', employeeData: employeeData, listOfMyRequestSickLeave: listOfMyRequestSickLeave};
    res.render('pages/employee/my-sick-leave', param);
}

const requestAnnualLeave = async (req, res) => {
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
            annualLeaveBalance: true,
        },
    })

    const getLeaveType = await prisma.leaveType.findMany({
        where: {
            uuid: '3432a8e3-fb91-4fd8-9ee8-0a760d17e365' //annual leave
        }
    });

    const getSetupWorkDays = await prisma.setupSystem.findFirst({
        select: {
            workDays: true,
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, pageTitle: 'Request Annual Leave', moment: moment, employeeData: employeeData, listOfleaveType: getLeaveType, getWorkDays: getSetupWorkDays};
    res.render('pages/employee/request-annual-leave', param)
}

const processRequestAnnualLeave = async (req, res) => {
    try {
        const { leave_description, start_duration, end_duration, days, leave_type, leave_type_description, business_unit_id, business_unit_name, division_id, division_name, jobtitle_id, jobtitle_name } = req.body;
        let startDuration = start_duration.split("-")[2] + '-' + start_duration.split("-")[1] + '-' + start_duration.split("-")[0];
        let endDuration = end_duration.split("-")[2] + '-' + end_duration.split("-")[1] + '-' + end_duration.split("-")[0];
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
        
        const getAnnualLeaveBalanceOfEmployee = await prisma.users.findFirst({
            where: {
                id: userInfo.id,
            },
            select: {
                annualLeaveBalance: true,
            }
        }) 
    
        if (getAnnualLeaveBalanceOfEmployee.annualLeaveBalance == 0) {
            req.flash('error', 'Your annual balance is ' + getAnnualBalanceOfEmployee.annualLeaveBalance + ', you cannot submit request annual leave !!!');
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);
            res.redirect('back');
            return
        }
    
        if (req.body.days > getAnnualLeaveBalanceOfEmployee.annualLeaveBalance) {
            req.flash('error', 'Your days off more than annual balance !!!');
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);
            res.redirect('back');
            return
        }
    
        const overlapRequests = await findOverlaps(prisma, { employeeId: Number(userInfo.id), start: moment.utc(startDuration).toDate(), end: moment.utc(endDuration).toDate() });
        if (overlapRequests.length > 0) {
            req.flash('error', buildOverlapMessage(overlapRequests));
            res.redirect('back');
            return
        }

        const insertRequestLeave = await prisma.requestLeave.create({
            data: {
                leaveDescription: leave_description,
                startDuration: moment.utc(startDuration).toDate(),
                endDuration: moment.utc(endDuration).toDate(),
                days: Number(days),
                employeeId: Number(userInfo.id),
                leaveType: Number(leave_type),
                leaveTypeDescription: leave_type_description,
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
        req.flash('success', 'Request annual leave successfully')
        res.redirect('back');
    } catch (error) {
        logger.error(error.message);
        req.flash('error', error.message);
        res.redirect('back');
    }
}

const requestSickLeave = async (req, res) => {
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
            sickLeaveBalance: true,
        },
    })

    const getLeaveType = await prisma.leaveType.findMany({
        where: {
            uuid: '70d32c0b-39e8-499e-ac79-fc001dc80775' //sick leave
        }
    });

    const getSetupWorkDays = await prisma.setupSystem.findFirst({
        select: {
            workDays: true,
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, pageTitle: 'Request Sick Leave', moment, employeeData: employeeData, listOfleaveType: getLeaveType, getWorkDays: getSetupWorkDays};
    res.render('pages/employee/request-sick-leave', param)

}

const processRequestSickLeave = async (req, res) => {
    try {
        const { leave_description, start_duration, leave_type, leave_type_description, employee_id, business_unit_id, business_unit_name, division_id, division_name, jobtitle_id, jobtitle_name } = req.body;
        let startDuration = start_duration.split("-")[2] + '-' + start_duration.split("-")[1] + '-' + start_duration.split("-")[0];
        let endDuration = startDuration;

        const userInfo = req.user;

        /*
        if(userInfo.employmentStatus != 'Permanent') {
            req.flash('error', 'Employement status is ' + userInfo.employmentStatus + ', you cannot submit request sick leave !!!')
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            res.redirect('back');
            return res.status(400).json({msg: "Employement status is not permanent !!!"});;
        } 
        */
        const getSickLeaveBalanceOfEmployee = await prisma.users.findFirst({
            where: {
                id: userInfo.id,
            },
            select: {
                sickLeaveBalance: true,
            }
        }) 
    
        if (getSickLeaveBalanceOfEmployee.sickLeaveBalance == 0) {
            req.flash('error', 'Your sick balance is ' + getSickLeaveBalanceOfEmployee.sickLeaveBalance + ', you cannot submit request sick leave !!!')
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            res.redirect('back');
            return res.status(400).json({msg: "Your sick balance is not enought !!!"});;
        }
    
        const createdBy = req.user.fullName;
        const updatedBy = req.user.fullName;
    
        const overlapRequests = await findOverlaps(prisma, { employeeId: Number(employee_id), start: moment.utc(startDuration).toDate(), end: moment.utc(endDuration).toDate() });
        if (overlapRequests.length > 0) {
            req.flash('error', buildOverlapMessage(overlapRequests));
            res.redirect('back');
            return
        }

        const insertRequestLeave = await prisma.requestLeave.create({
            data: {
                leaveDescription: leave_description,
                startDuration: moment.utc(startDuration).toDate(),
                endDuration: moment.utc(endDuration).toDate(),
                days: 1,
                employeeId: Number(employee_id),
                leaveType: Number(leave_type),
                leaveTypeDescription: leave_type_description,
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
        req.flash('success', 'Request sick leave successfully')
        res.redirect('back');
    } catch (error) {
        logger.error(error.message);
        req.flash('error', error.message);
        req.flash('leave_description', leave_description);
        req.flash('start_duration', start_duration);
        res.redirect('back');
    }

}

const getDataOfCalendarAndWorkdays = async (req, res) => {
    const { startDate, days } = req.params;
    let totalData = 0;
    let eventDate;
    let eventDay;
    
    const getSetupSystem = await prisma.setupSystem.findFirst({
        select: {
            workDays: true,
        }
    })

    let workDays = 5;
    if (getSetupSystem) 
        workDays = getSetupSystem.workDays;

    for (let i = 0; i < days; i++) {
        if (i == 0) {
            eventDate = startDate;
        } else {
            eventDate = moment.utc(startDate,'YYYY-MM-DD').add(i,'days').toDate('YYYY-MM-DD');;
        }
        eventDay = moment.utc(eventDate).format('dddd');
        
        if (workDays == 5) {
            if (eventDay == 'Saturday' || eventDay == 'Sunday') {
                totalData++;
            } else {
                const getDataCalendar = await prisma.setupCalendar.findFirst({
                    where: {
                        is_workdays: 0,
                        eventDate: moment.utc(eventDate).toDate(),
                    }
                })    
                if (getDataCalendar != null) {
                    totalData++;
                }
            }    
        } else {
            if (eventDay == 'Sunday') {
                totalData++;
            } else {
                const getDataCalendar = await prisma.setupCalendar.findFirst({
                    where: {
                        is_workdays: 0,
                        eventDate: moment.utc(eventDate).toDate(),
                    }
                })    
                if (getDataCalendar != null) {
                    totalData++;
                }
            }    
        }
    }
    res.status(200).send({
        status: true,
        statusCode: 200,
        message: 'Get data successfully',
        data: totalData
    });   
}

const showTotalDayOfCalendar = async (req, res) => {
    const { startDate, days } = req.params;
    const totalDay = await getTotalDayOfCalendar (startDate, days);

    res.status(200).send({
        status: true,
        statusCode: 200,
        message: 'Get data successfully',
        data: totalDay
    });   
}

const requestSickLeave2 = async (req, res) => {
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

    const getLeaveType = await prisma.leaveType.findMany({
        where: {
            uuid: '75872dba-79e1-487a-a012-a3f09fcf2592' //sick leave 2
        }
    });

    const getSetupWorkDays = await prisma.setupSystem.findFirst({
        select: {
            workDays: true,
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, pageTitle: 'Request Sick Leave 2', moment, employeeData: employeeData, listOfleaveType: getLeaveType, getWorkDays: getSetupWorkDays };
    res.render('pages/employee/request-sick-leave2', param)
}

const processRequestSickLeave2 = async (req, res) => {
    try {
        const { leave_description, start_duration, end_duration, days, leave_type, leave_type_description, employee_id, business_unit_id, business_unit_name, division_id, division_name, jobtitle_id, jobtitle_name } = req.body;
        const userInfo = req.user;
        /*
        if(userInfo.employmentStatus != 'Permanent') {
            req.flash('error', 'Employement status is ' + userInfo.employmentStatus + ', you cannot submit request sick leave !!!')
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);
            res.redirect('back');
            return res.status(400).json({msg: "Employement status is not permanent !!!"});;
        } */
        
        if ( days == 1) {
            req.flash('error', 'Duration must be more than 1 day !!!');
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);
            res.redirect('back');
            return res.status(400).json({msg: "Duration must be more than 1 day !!!"});
        }
        if(req.files === null) {
            req.flash('error', 'No file uploaded');
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);
            res.redirect('back');
            return res.status(400).json({msg: "No file uploaded"});
        }
        const file = req.files.image;
        const fileSize = file.data.length;
        const ext = path.extname(file.name);
        const fileName = file.md5 + ext;
        const url = `${req.protocol}://${req.get("host")}/images/sickleave/${fileName}`;
        const allowedType = ['.png','.jpg','.jpeg'];
     
        if(!allowedType.includes(ext.toLowerCase())) {
            req.flash('error', 'Invalid images file');
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);
            res.redirect('back');
            return res.status(422).json({msg: "Invalid images file"});
        }
        if(fileSize > 3500000) {
            req.flash('error', 'Image must be less than 3.5 MB');
            req.flash('leave_description', leave_description);
            req.flash('start_duration', start_duration);
            req.flash('end_duration', end_duration);
            req.flash('days', days);
            res.redirect('back');
            return res.status(422).json({msg: "Image must be less than 3.5 MB"});
        }
    
        const pathTo = `public/images/sickleave/${fileName}.${ext}`;
        if (! fs.existsSync(pathTo)) {
            // if not exist folder create folder
            const destination = path.dirname(pathTo);
            fs.mkdirSync(destination, { recursive: true });
        }
    
        file.mv(`./public/images/sickleave/${fileName}`, async(err)=>{
            if (err) { 
                req.flash('error', err.message);
                req.flash('leave_description', leave_description);
                req.flash('start_duration', start_duration);
                req.flash('end_duration', end_duration);
                req.flash('days', days);
                res.redirect('back');    
                return res.status(500).json({msg: err.message});
            }
            try {
                const startDuration = start_duration.split("-")[2] + '-' + start_duration.split("-")[1] + '-' + start_duration.split("-")[0];
                const endDuration = end_duration.split("-")[2] + '-' + end_duration.split("-")[1] + '-' + end_duration.split("-")[0];
                const createdBy = req.user.fullName;
                const updatedBy = req.user.fullName;
            
                const overlapRequests = await findOverlaps(prisma, { employeeId: Number(employee_id), start: moment.utc(startDuration).toDate(), end: moment.utc(endDuration).toDate() });
                if (overlapRequests.length > 0) {
                    req.flash('error', buildOverlapMessage(overlapRequests));
                    res.redirect('back');
                    return
                }

                const insertRequestLeave = await prisma.requestLeave.create({
                    data: {
                        leaveDescription: leave_description,
                        startDuration: moment.utc(startDuration).toDate(),
                        endDuration: moment.utc(endDuration).toDate(),
                        days: 1,
                        employeeId: Number(employee_id),
                        leaveType: Number(leave_type),
                        leaveTypeDescription: leave_type_description,
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
    
                if (insertRequestLeave) {
                    req.flash('success', 'Request sick leave 2 successfull')
                    res.redirect('back');
                    res.status(201).json({msg: "Request sick leave 2 created Successfuly"});
                }
                req.flash('error', 'Insert data failed !!!');
                res.redirect('back');
            } catch (error) {
                logger.error(error.message);
                req.flash('error', error.message);
                res.redirect('back');
            }
        })
    } catch (err) {
        logger.error(err.message);
        req.flash('error', error.message);
        req.flash('leave_description', leave_description);
        req.flash('start_duration', start_duration);
        req.flash('end_duration', end_duration);
        req.flash('days', days);
        res.redirect('back');
    }
}

const requestUnpaidLeave = async (req, res) => {
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
            annualLeaveBalance: true,
        },
    })

    const getLeaveType = await prisma.leaveType.findMany({
        where: {
            uuid: '0a06944b-3abb-4e40-b627-41c83db31e80' //unpaid leave
        }
    });

    const getSetupWorkDays = await prisma.setupSystem.findFirst({
        select: {
            workDays: true,
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, pageTitle: 'Request Unpaid Leave', moment: moment, employeeData: employeeData, listOfleaveType: getLeaveType, getWorkDays: getSetupWorkDays };
    res.render('pages/employee/request-unpaid-leave', param)
}

const processRequestUnpaidLeave = async (req, res) => {
    try {
        const { leave_description, start_duration, end_duration, days, leave_type, leave_type_description, id, business_unit_id, business_unit_name, division_id, division_name, jobtitle_id, jobtitle_name } = req.body;
        let startDuration = start_duration.split("-")[2] + '-' + start_duration.split("-")[1] + '-' + start_duration.split("-")[0];
        let endDuration = end_duration.split("-")[2] + '-' + end_duration.split("-")[1] + '-' + end_duration.split("-")[0];
        const createdBy = req.user.fullName;
        const updatedBy = req.user.fullName;
    
        const overlapRequests = await findOverlaps(prisma, { employeeId: Number(id), start: moment.utc(startDuration).toDate(), end: moment.utc(endDuration).toDate() });
        if (overlapRequests.length > 0) {
            req.flash('error', buildOverlapMessage(overlapRequests));
            res.redirect('back');
            return
        }

        const insertRequestLeave = await prisma.requestLeave.create({
            data: {
                leaveDescription: leave_description,
                startDuration: moment.utc(startDuration).toDate(),
                endDuration: moment.utc(endDuration).toDate(),
                days: Number(days),
                employeeId: Number(id),
                leaveType: Number(leave_type),
                leaveTypeDescription: leave_type_description,
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
        req.flash('success', 'Request unpaid leave successfully')
        res.redirect('back');
    } catch (error) {
        logger.error(error.message);
        req.flash('error', error.message)
        req.flash('leave_description', leave_description);
        req.flash('start_duration', start_duration);
        req.flash('end_duration', end_duration);
        req.flash('days', days);
        res.redirect('back');
        return res.status(400).json({msg: "Employement status is not permanent !!!"});;    
    }
}

module.exports = {
    showDataEmployeeJsonbyStatus,
    showDataEmployeeJson,
    listEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeDetail,
    setInactiveEmployee,
    myProfileEmployee,
    updateProfileImage,
    showPromoteEmployee,
    processPromoteEmployee,
    myAnnualLeave,
    mySickLeave,
    requestAnnualLeave,
    processRequestAnnualLeave,
    requestSickLeave,
    processRequestSickLeave,
    getDataOfCalendarAndWorkdays,
    showTotalDayOfCalendar,
    requestSickLeave2,
    processRequestSickLeave2,
    requestUnpaidLeave,
    processRequestUnpaidLeave,
    showSetupAnnualLeaveEmployee,
    processSetupAnnualLeaveEmployee,
}
    