const { Prisma } = require('@prisma/client');
const prisma = require('../libs/prisma');

const moment = require('moment');
const { listRolesPermission } = require('../helper/roles-permission');
var logger = require('../libs/logger');
const { validationResult } = require('express-validator');

const showSalaryTemplate = async (req, res) => {
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search){
        where = { templateName : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.salaryTemplateHeader.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    const currentPage = page || 0;

    const getDataSalaryTemplate = await prisma.salaryTemplateHeader.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            templateName: true,
            isActive: true,
        }
    });

    const metaData= { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount};
    const listOfSalaryTemplate = { meta : metaData, data: getDataSalaryTemplate};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'Salary Template', listOfSalaryTemplate: listOfSalaryTemplate}
    res.render('pages/salary-template/index', param);
}

const showAddSalaryTemplate = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'Salary Template'}
    res.render('pages/salary-template/add', param)
}

const showAddComponents = async (req, res) => {
    const { uuid } = req.params;
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const getSalaryTemplate = await prisma.salaryTemplateHeader.findFirst({
        where: {
            uuid: uuid,
        },
        select: {
            id: true,
            templateName: true,
        }
    })

    const listOfSalaryComponent = await prisma.$queryRaw`select id, componentCode, componentName from salaryComponent where isActive=1 and salaryComponent.id not In (SELECT salaryComponentId FROM salaryTemplateDetails WHERE salaryTemplateId=${getSalaryTemplate.id}) ORDER By sequence`
    const listOfSalaryTemplateDetails = await prisma.salaryTemplateDetails.findMany({
        where: {
            salaryTemplateId: Number(getSalaryTemplate.id),
        },
        select: {
            id: true,
            uuid: true,
            salaryTemplateId: true,
            salaryComponentId: true,
            component: {
                select: {
                    id: true,
                    componentCode: true,
                    componentName: true,
                    componentCategories: {
                        select: {
                            id: true,
                            componentCategory: true,
                        }
                    },
                    componentTypes: {
                        select: {
                            id: true,
                            componentType: true,    
                        }
                    }
                }
            }
        }
    })

    const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'Salary Template', getSalaryTemplate, listOfSalaryComponent, listOfSalaryTemplateDetails}
    res.render('pages/salary-template/edit', param)
}

const insertSalaryTemplateHeader = async (req, res) => {
    const { template_name } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;
    
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            req.flash(`${errors.errors[0].param}`, template_name);
            req.flash('errorInsert', errors.errors[0].msg);
            res.redirect('back');
        }

        const isDataExist = await prisma.salaryTemplateHeader.findUnique({
            where: {
                templateName: template_name,
            }
        })
        if (isDataExist) {
            req.flash('template_name', template_name);
            req.flash('errorInsert', 'Template name must be unique or already exist !!!');
            res.redirect('back');
        }
         
        const insertDataSalaryTemplateHeadar = await prisma.salaryTemplateHeader.create({
            data: {
                templateName: template_name,
                createdBy,
                updatedBy,
            }       
        })
    
        if (insertDataSalaryTemplateHeadar) {
            res.redirect('back');
        }       
    } catch (e) {
        console.log(e);
        logger.error(e, 'Error creating salary template')

        /*
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            // P2022: Unique constraint failed
            // Prisma error codes: https://www.prisma.io/docs/reference/api-reference/error-reference#error-codes
            if (e.code === 'P2002') {
                logger.error('The template name already exists', e)
                throw new e;
            }
        } */
        throw e
    }
}

const updateSalaryTemplateHeader = async (req, res) => {
    const { template_uuid, template_name_edit, template_name_ori, is_active } = req.body;
    const updatedBy = req.user.fullName;

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            req.flash('template_uuid', template_uuid);
            req.flash(`${errors.errors[0].param}`, template_name_edit);
            req.flash(template_name_ori, template_name_ori);
            req.flash('is_active', is_active);
            req.flash('errorUpdate', errors.errors[0].msg);
            res.redirect('back');
        }

        let isDataExist;
        if (template_name_ori != template_name_edit) {
            isDataExist = await prisma.salaryTemplateHeader.findUnique({
                where: {
                    templateName: template_name_edit,
                },
                select: {
                    id: true,
                }
            })
        }
        if (isDataExist) {
            req.flash('template_uuid', template_uuid);
            req.flash('template_name', template_name_edit);
            req.flash('template_name_ori', template_name_ori);
            req.flash('is_active', is_active);
            req.flash('errorUpdate', 'Template name must be unique or already exist');
            res.redirect('back');
        }
        const updateDataSalaryTemplateHeader = await prisma.salaryTemplateHeader.update({
            where: {
                uuid: template_uuid,
            },
            data: {
                templateName: template_name_edit,
                isActive: Number(is_active),
                updatedBy,
            }
        })
    
        if (updateDataSalaryTemplateHeader) {
            res.redirect('back');
        }
    } catch (e) {
        console.log(e);
        logger.error(e, 'Error update salary template')
    }
}

const insertComponents = async (req, res) => {
    const { component_id, template_id} =  req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const insertDataSalaryTemplateDetails = await prisma.salaryTemplateDetails.create({
        data: {
            salaryComponentId: Number(component_id),
            salaryTemplateId: Number(template_id),
            createdBy,
            updatedBy
        }
    })

    if(insertDataSalaryTemplateDetails) {
        res.redirect('back');
    }
}

const deleteOfSalaryTemplateDetails =  async (req, res) => {
    const { template_uuid, component_id } = req.body;

    const isExistDataComponent = await prisma.usersSalary.findFirst({
        where: {
            componentId: Number(component_id),
        },
        select: {
            id: true,
            componentId: true,
        }
    })

    if (isExistDataComponent) {
        req.flash('errorDelete', 'You cannot delete this data, already used by employee salary !!!')
        res.redirect('back');
        return
    }

    const deleteData = await prisma.salaryTemplateDetails.delete({
        where: {
            uuid: template_uuid,
        }
    })

    if(deleteData) {
        res.redirect('back');
    }
}

const showSynchronizeComponent = async (req, res) => {
    const { uuid } = req.params; 
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const getSalaryTemplate = await prisma.salaryTemplateDetails.findFirst({
        where: {
            uuid: uuid,
        },
        select: {
            uuid: true,
            salaryTemplateId: true,
            salaryComponentId: true,
            component: {
                select: {
                    componentCode: true,
                    componentName: true,
                }
            }
        }
    })

    const getEmployee = await prisma.users.findMany({
        where: {
            status: 'Active',
            salaryTemplateHeaderId: getSalaryTemplate.salaryTemplateId,
        },
        select: {
            id: true,
            fullName: true,
            email: true,
        }
    })

    const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'Synchronize Salary Template', getSalaryTemplate, getEmployee};
    res.render('pages/salary-template/synchronize', param)
}

const processSynchronizeComponent = async (req, res) => {
    const selectionEmployee = req.body.selection_employee;
    const salaryTemplateId = req.body.salary_template_id;
    const salaryComponentId = req.body.salary_component_id;
    const employee = req.body.employee;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;
    const getSalaryComponent = await prisma.salaryComponent.findFirst({
        where: {
            id: Number(salaryComponentId),
        },
        select: {
            id: true,
            componentCode: true,
            componentName: true,
            sequence: true,
            isTakeHomePay: true,
            salaryComponentCategoryId: true,
            componentCategories: {
                select: {
                    componentCategory: true,
                }
            },
            salaryComponentTypeId: true,
            componentTypes: {
                select: {
                    componentType: true,
                }
            }
        }
    })
    if (selectionEmployee == 'All') {
        let dataEmployee = await prisma.usersSalary.findMany();
        if (dataEmployee.length == 0) {
            req.flash('error', 'You must setup at least single employee salary first !!!')
            res.redirect('back');
        }
        const getEmployee = await prisma.users.findMany({
            where: {
                status: 'Active',
                salaryTemplateHeaderId: Number(salaryTemplateId),
            },
            select: {
                id: true,
                fullName: true,
                email: true,
            }
        })

        for(let index = 0; index < getEmployee.length; index++) {
            const isExistUsersSalary = await prisma.usersSalary.findFirst({
                where: {
                    usersId: Number(getEmployee[index].id),
                    componentId: Number(getSalaryComponent.id),    
                },
                select: {
                    uuid: true,
                }
            })
            if (isExistUsersSalary == null ) {
                const insertUsersSalary = await prisma.usersSalary.create({
                    data: {
                        usersId: Number(getEmployee[index].id),
                        componentId: Number(getSalaryComponent.id),
                        componentCode: getSalaryComponent.componentCode,
                        componentName: getSalaryComponent.componentName,
                        salaryComponentTypeId: Number(getSalaryComponent.salaryComponentTypeId),
                        salaryComponentCategoryName: getSalaryComponent.componentCategories.componentCategory,
                        salaryComponentCategoryId: Number(getSalaryComponent.salaryComponentCategoryId),
                        salaryComponentTypeName: getSalaryComponent.componentTypes.componentType,
                        isTakeHomePay: getSalaryComponent.isTakeHomePay,
                        sequence: getSalaryComponent.sequence,
                        createdBy, 
                        updatedBy,
                    }
                })
            }
        }
        req.flash('success', 'Synchronize successfully')
        res.redirect('back');
    } else {
        if (employee == undefined) {
            req.flash('error', 'Please select employee first !!!')
            res.redirect('back');    
        }
        for (let index = 0; index < employee.length; index++) {
            const isExistUsersSalary = await prisma.usersSalary.findFirst({
                where: {
                    usersId: Number(employee[index]),
                    componentId: Number(getSalaryComponent.id),    
                },
                select: {
                    uuid: true,
                }
            })
            
            if (isExistUsersSalary == null ) {
                const insertUsersSalary = await prisma.usersSalary.create({
                    data: {
                        usersId: Number(employee[index]),
                        componentId: Number(getSalaryComponent.id),
                        componentCode: getSalaryComponent.componentCode,
                        componentName: getSalaryComponent.componentName,
                        salaryComponentTypeId: Number(getSalaryComponent.salaryComponentTypeId),
                        salaryComponentCategoryName: getSalaryComponent.componentCategories.componentCategory,
                        salaryComponentCategoryId: Number(getSalaryComponent.salaryComponentCategoryId),
                        salaryComponentTypeName: getSalaryComponent.componentTypes.componentType,
                        isTakeHomePay: getSalaryComponent.isTakeHomePay,
                        sequence: getSalaryComponent.sequence,
                        createdBy, 
                        updatedBy,
                    }
                })
            }
        }
        req.flash('success', 'Synchronize successfully')
        res.redirect('back');
    }
}

module.exports = {
    showSalaryTemplate,
    showAddSalaryTemplate,
    insertSalaryTemplateHeader,
    showAddComponents,
    insertComponents,
    updateSalaryTemplateHeader,
    deleteOfSalaryTemplateDetails,
    showSynchronizeComponent,
    processSynchronizeComponent,
}