var logger = require('../libs/logger'),
    csrf = require('../libs/csrf');

const { Prisma } = require('@prisma/client');
const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');

const moment = require('moment');

const listOfSalaryComponent = async (req, res) => {
    const query = req.query;
    let search = query.search;
    let where = {};
    if (query.search){
        where = { componentName : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.salaryComponent.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataSalaryComponentType = await prisma.salaryComponentType.findMany({
        where: {
            isActive: 1,
        },
        select: {
            id: true,
            componentType: true,
        }
    })

    const getDataSalaryComponentCategory = await prisma.salaryComponentCategory.findMany({
        where: {
            isActive: 1,
        },
        select : {
            id: true,
            componentCategory: true,
        }
    })

    const getDataSalaryComponent = await prisma.salaryComponent.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            componentCode: true,
            componentName: true,
            componentTypes: {
                select: {
                    id: true,
                    componentType: true,    
                }
            },
            componentCategories: {
                select: {
                    id: true,
                    componentCategory: true,    
                }
            },
            isTaxable: true,
            isActive: true,
            sequence: true,
        }
    })

    const metaData= { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfSalaryComponent = { meta : metaData, data: getDataSalaryComponent};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'Salary Component', listOfDataSalaryComponentCategory: getDataSalaryComponentCategory, listOfDataSalaryComponentType: getDataSalaryComponentType, listOfSalaryComponent: listOfSalaryComponent }; 
    res.render('pages/salary-component/index', param);
}

const createSalaryComponent = async (req, res) => {
    const { component_code, component_name, component_type, component_category, is_taxable, sequence } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    try {
        const insertDataSalaryComponent = await prisma.salaryComponent.create({
            data: {
                componentCode: component_code,
                componentName: component_name,
                salaryComponentTypeId: Number(component_type),
                salaryComponentCategoryId: Number(component_category),
                isTakeHomePay: 1,
                isTaxable: Number(is_taxable),
                sequence: Number(sequence),
                createdBy: createdBy,
                updatedBy: updatedBy,
            }
        })
    
        if(insertDataSalaryComponent) {
            req.flash('success', 'Data insert successfully')
            res.redirect('back');
        }        
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            // The .code property can be accessed in a type-safe manner
            if (e.code === 'P2002') {
              logger.error(
                'There is a unique constraint violation !!!'
              )
            }
        }
        throw e
    }
}

const updateSalaryComponent = async (req, res) => {
    const { component_uuid, component_code, component_name, component_type, component_category, is_taxable, is_active, sequence } = req.body;
    const updatedBy = req.user.fullName;

    try {
        const updateDatacSalaryComponent = await prisma.salaryComponent.update({
            where: {
                uuid: component_uuid,
            },
            data: {
                componentCode: component_code,
                componentName: component_name,
                salaryComponentTypeId: Number(component_type),
                salaryComponentCategoryId: Number(component_category),
                isTaxable: Number(is_taxable),
                isActive: Number(is_active),
                sequence: Number(sequence),
                updatedBy: updatedBy,
            }
        })
    
        if (updateDatacSalaryComponent) {
            req.flash('success', 'Data update successfully')
            res.redirect('back');
        }
    } catch (e) {
        logger.error(e);
    }
}

const deleteSalaryComponent = async (req, res) => {
    const { component_id, component_uuid } = req.body;

    try {
        const salaryTemplateDetail = await prisma.salaryTemplateDetails.findFirst({
            where: {
                salaryComponentId: Number(component_id),
            },
            select: {
                id: true
            }
        })
        logger.debug(salaryTemplateDetail)
        if (salaryTemplateDetail) {
            logger.debug(' tdk boleh delete');
            req.flash('errorDelete', 'You cannot delete this data because already used by Salary Template !!!');
            res.redirect('back');    
        }
        const deleteData = await prisma.salaryComponent.delete({
            where: {
                uuid: component_uuid,
            }
        })
    
        if(deleteData){
            req.flash('success', 'Data delete successfully')
            res.redirect('back');
        }            
    } catch (e) {
        logger.error(e)
        req.flash('error', 'Error delete data !!!');
        res.redirect('back');        
    }
}

module.exports = { 
    listOfSalaryComponent, 
    createSalaryComponent, 
    updateSalaryComponent, 
    deleteSalaryComponent,
}