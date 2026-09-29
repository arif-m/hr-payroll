const prisma = require('../libs/prisma');

const moment = require('moment');
const { listRolesPermission } = require('../helper/roles-permission');
const employmentHistory = require('../libs/payroll/employment-history');
const logger = require('../libs/logger');


const showSetupEmployeeSalary = async (req, res) => {
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
            salaryTemplate: {
                select: {
                    id: true,
                    templateName: true,
                }
            }
        },
        orderBy: {
            joinDate: 'desc',
        }
    });
    const metaDataEmployee = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfEmployee = { meta : metaDataEmployee, data: getDataEmployee};

    const listOfDataTemplate = await prisma.salaryTemplateHeader.findMany({
        select: {
            id: true,
            uuid: true,
            templateName: true,
        }
    })

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let  param = { user: userInfo, getRoles: getRoles, search, pageTitle: 'Setup Employee Salary', moment, listOfEmployee: listOfEmployee, listOfDataTemplate };
    res.render('pages/employee/setup-employee-salary', param);
}

const updateSetupEmployeeSalary = async (req, res) => {
    const { employee_id, employee_uuid, template_name } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const updateDataUsers = await prisma.users.update({
        where: {
            uuid: employee_uuid,
        },
        data: {
            salaryTemplateHeaderId: Number(template_name),
            updatedBy,
        }
    })
    
    const getSalaryTemplateDetails = await prisma.salaryTemplateDetails.findMany({
        where: {
            salaryTemplateId: Number(template_name),
        },
        select: {
            id: true,
            uuid: true,
            salaryTemplateId: true,
            component: {
                select: {
                    id: true,
                    componentCode: true,
                    componentName: true,
                    salaryComponentTypeId: true,
                    componentTypes: {
                        select: {
                            id: true,
                            componentType: true,
                        }
                    },
                    salaryComponentCategoryId: true,
                    componentCategories: {
                        select: {
                            id: true,
                            componentCategory: true,
                        }
                    },
                    isTakeHomePay: true,
                    sequence: true,
                }
            }
        }
    })

    for (let index = 0; index < getSalaryTemplateDetails.length; ++index) {
        const componentId = getSalaryTemplateDetails[index].component.id;
        const componentCode = getSalaryTemplateDetails[index].component.componentCode;
        const componentName = getSalaryTemplateDetails[index].component.componentName;
        const componentType = getSalaryTemplateDetails[index].component.salaryComponentTypeId;
        const componentTypeName = getSalaryTemplateDetails[index].component.componentTypes.componentType;
        const componentCategory = getSalaryTemplateDetails[index].component.salaryComponentCategoryId;
        const componentCategoryName = getSalaryTemplateDetails[index].component.componentCategories.componentCategory;
        const isTakeHomePay = getSalaryTemplateDetails[index].component.isTakeHomePay;
        const sequence = getSalaryTemplateDetails[index].component.sequence;

        const insertSetupSalaryEmployee = await prisma.usersSalary.create({
            data: {
                usersId: Number(employee_id),
                componentId: Number(componentId),
                componentCode,
                componentName,
                salaryComponentTypeId: componentType,
                salaryComponentTypeName: componentTypeName,
                salaryComponentCategoryId: componentCategory,
                salaryComponentCategoryName: componentCategoryName,
                isTakeHomePay,
                sequence,
                createdBy,
                updatedBy,
            }
        })

    }
    res.redirect('back');
}

const editEmployeeSalary = async (req, res) => {
    const { uuid } = req.params;
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const getUsersSalary = await prisma.users.findFirst({
        where: {
            uuid: uuid,
        },
        select: {
            id: true,
            uuid: true,
            user5: {
                select: {
                    componentId: true,
                    componentCode: true,
                }    
            }
        }
    })

    const listOfSalaryComponent = await prisma.$queryRaw`select id, componentCode, componentName from salaryComponent where isActive=1 and salaryComponent.id not In (SELECT componentId FROM usersSalary WHERE usersId=${getUsersSalary.id}) ORDER By sequence`;

    const getUsers = await prisma.users.findFirst({
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
            salaryTemplate: {
                select: {
                    id: true,
                    templateName: true,
                }
            }
        },
        orderBy: {
            joinDate: 'desc',
        }
    })

    const listOfEmployeeSalaryDetails = await prisma.$queryRaw`SELECT usersSalary.id, usersSalary.uuid, componentId, componentCode, componentName, componentType, componentCategory, formula, amount FROM usersSalary JOIN salaryComponentType ON usersSalary.salaryComponentTypeId = salaryComponentType.id JOIN salaryComponentCategory ON usersSalary.salaryComponentCategoryId = salaryComponentCategory.id  WHERE usersId = ${Number(getUsers.id)} ORDER BY sequence`
    const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'Setup Employee Salary', getUsers, listOfEmployeeSalaryDetails, listOfSalaryComponent}
    res.render('pages/employee/setup-employee-salary-edit', param)
}

const insertComponentSetupEmployeeSalary = async (req, res) => {
    try {        
        const userId  = req.body.user_id;
        const componentId = req.body.component_id;
        const createdBy = req.user.fullName;
        const updatedBy = req.user.fullName;
    
        const getSalaryComponent = await prisma.salaryComponent.findFirst({
            where: {
                id: Number(componentId),
            },
            select: {
                componentCode: true,
                componentName: true,
                salaryComponentTypeId: true,
                componentTypes: {
                    select: {
                        componentType: true,
                    }
                },
                salaryComponentCategoryId: true,
                componentCategories: {
                    select: {
                        componentCategory: true,
                    }
                },
                isTaxable: true,
                sequence: true,
                isTakeHomePay: true,
            }
        })

        const componentCode = getSalaryComponent.componentCode;
        const componentName = getSalaryComponent.componentName;
        const componentType = getSalaryComponent.salaryComponentTypeId;
        const componentTypeName = getSalaryComponent.componentTypes.componentType;
        const componentCategory = getSalaryComponent.salaryComponentCategoryId;
        const componentCategoryName = getSalaryComponent.componentCategories.componentCategory;
        const isTakeHomePay = getSalaryComponent.isTakeHomePay;
        const sequence = getSalaryComponent.sequence;
    
        const insertSetupSalaryEmployee = await prisma.usersSalary.create({
            data: {
                usersId: Number(userId),
                componentId: Number(componentId),
                componentCode,
                componentName,
                salaryComponentTypeId: componentType,
                salaryComponentTypeName: componentTypeName,
                salaryComponentCategoryId: componentCategory,
                salaryComponentCategoryName: componentCategoryName,
                isTakeHomePay,
                sequence,
                createdBy,
                updatedBy,
            }
        })

        // Riwayat kepegawaian: komponen baru (gagal pencatatan tak menggagalkan operasi utama).
        try {
            const snap = await employmentHistory.snapshotCurrentState(prisma, Number(userId));
            await employmentHistory.recordChange(prisma, {
                usersId: Number(userId),
                effectiveDate: new Date(),
                changeType: employmentHistory.CHANGE_TYPES.ADD_COMPONENT,
                reason: `Tambah komponen ${componentName}`,
                ...snap,
                actor: createdBy,
            });
        } catch (histErr) {
            logger.error(`insertComponentSetupEmployeeSalary riwayat: ${histErr.message}`);
        }
    
        //res.flash('success', '')
        res.redirect('back');
    } catch (error) {
        logger.error(error.message);
        req.flash('error', error.message);
        res.redirect('back');
    }

}

const updateComponentSetupEmployeeSalary = async (req, res) => {
    try {
        // Normalisasi: body-parser mengirim STRING bila hanya 1 baris form,
        // ARRAY bila lebih. [].concat menyeragamkan keduanya tanpa bug
        // "id.length" yang memecah string id per karakter.
        const ids = [].concat(req.body.id || []);
        const amountsById = {};
        for (const rawId of ids) {
            const key = `amt_${rawId}`;
            if (req.body[key] === undefined || req.body[key] === '') continue; // baris Formula tidak mengirim amt
            const value = Number(String(req.body[key]).replace(/,/g, ''));
            if (!Number.isFinite(value) || value < 0) {
                throw new Error(`Nominal tidak valid untuk komponen id ${rawId}`);
            }
            amountsById[Number(rawId)] = value;
        }

        const entries = Object.entries(amountsById);
        if (entries.length === 0) {
            throw new Error('Tidak ada perubahan nominal yang valid untuk disimpan');
        }

        // Validasi dulu semua id ada (hindari P2025 di tengah transaksi).
        const found = await prisma.usersSalary.findMany({
            where: { id: { in: entries.map(([id]) => Number(id)) } },
            select: { id: true },
        });
        const foundIds = new Set(found.map((r) => r.id));
        for (const id of Object.keys(amountsById)) {
            if (!foundIds.has(Number(id))) throw new Error(`Komponen gaji id ${id} tidak ditemukan`);
        }

        // Nominal LAMA per komponen — untuk keterangan perubahan di riwayat.
        const beforeRows = await prisma.usersSalary.findMany({
            where: { id: { in: entries.map(([id]) => Number(id)) } },
            select: { id: true, usersId: true, componentName: true, amount: true },
        });
        const beforeById = new Map(beforeRows.map((r) => [r.id, r]));

        await prisma.$transaction(async (tx) => {
            for (const [id, value] of entries) {
                await tx.usersSalary.update({
                    where: { id: Number(id) },
                    data: { amount: value },
                });
            }
        });

        // Riwayat kepegawaian: perubahan nominal (gagal pencatatan tak menggagalkan update).
        try {
            const usersId = beforeRows[0]?.usersId;
            if (usersId) {
                const details = entries.map(([id, value]) => {
                    const before = beforeById.get(Number(id));
                    return `${before?.componentName || 'Komponen ' + id}: ${Number(before?.amount || 0)} → ${value}`;
                }).join('; ');
                const snap = await employmentHistory.snapshotCurrentState(prisma, usersId);
                await employmentHistory.recordChange(prisma, {
                    usersId,
                    effectiveDate: new Date(),
                    changeType: employmentHistory.CHANGE_TYPES.CHANGE_COMPONENT,
                    reason: details,
                    ...snap,
                    actor: req.user.fullName,
                });
            }
        } catch (histErr) {
            logger.error(`updateComponentSetupEmployeeSalary riwayat: ${histErr.message}`);
        }

        req.flash('success', 'Update data successfully !!');
    } catch (error) {
        logger.error(`updateComponentSetupEmployeeSalary: ${error.message}`);
        req.flash('error', error.message);
    }
    res.redirect('/setup-employee-salary');
}

module.exports = {
    showSetupEmployeeSalary,
    updateSetupEmployeeSalary,
    editEmployeeSalary,
    insertComponentSetupEmployeeSalary,
    updateComponentSetupEmployeeSalary,
}