const prisma = require('../libs/prisma');
const logger = require('../libs/logger');

const moment = require('moment');
const { listRolesPermission } = require('../helper/roles-permission');
const generalHelper = require('../helper/general');

const showBpjsTenagaKerjaTemplate = async (req, res) => {
    const query = req.query;
    let search = query.search;
    let where = {};
    if (query.search){
        where = { templateName : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.templateBpjsTenagaKerjaHeader.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;


    const getDataBpjsTenagaKerjaTemplate = await prisma.templateBpjsTenagaKerjaHeader.findMany({
        select: {
            id: true,
            uuid: true,
            templateName: true,
            isActive: true,
        }
    });

    const metaData= { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfBpjsTenagaKerjaTemplate = { meta : metaData, data: getDataBpjsTenagaKerjaTemplate};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'Bpjs Tenaga Kerja Template', listOfBpjsTenagaKerjaTemplate: listOfBpjsTenagaKerjaTemplate}
    res.render('pages/bpjs-tenaga-kerja-template/index', param);
}

const showAddBpjsTenagaKerjaTemplate = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'BPJS Tenaga Kerja Template'}
    res.render('pages/bpjs-tenaga-kerja-template/add', param)
}

const showAddBpjsTenagaKerjaComponents = async (req, res) => {
    const { uuid } = req.params;
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const listOfSalaryTemplateHeader = await prisma.salaryTemplateHeader.findMany({
        where: {
            isActive: 1,
        },
        select: {
            id: true,
            templateName: true,
        }
    })

    const getBpjsTenagaKerjaTemplate = await prisma.templateBpjsTenagaKerjaHeader.findFirst({
        where: {
            uuid: uuid,
        }
    })

    const listOfBpjsTenagaKerjaComponent = await prisma.$queryRaw`select id, componentCode, componentName from bpjsTenagaKerjaComponent where isActive=1 and bpjsTenagaKerjaComponent.id not In (SELECT componentId FROM templateBpjsTenagaKerjaDetails WHERE bpjsTenagaKerjaTemplateId=${getBpjsTenagaKerjaTemplate.id}) ORDER By sequence`
    
    const listOfBpjsTenagaKerjaTemplateDetails = await prisma.templateBpjsTenagaKerjaDetails.findMany({
        where: {
            bpjsTenagaKerjaTemplateId: Number(getBpjsTenagaKerjaTemplate.id),
        },
        select: {
            id: true,
            uuid: true,
            salaryTemplateId: true,
            templateOfSalary: {
                select: {
                    id: true,
                    templateName: true
                }
            },
            bpjsTenagaKerjaTemplateId: true,
            componentId: true,
            componentCode: true,
            componentName: true,
            percentage: true,
            minimumWages: true,
            maximumWages: true,
            formula: true,
        }
    })

    const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'BPJS Tenaga Kerja Template', listOfSalaryTemplateHeader, getBpjsTenagaKerjaTemplate, listOfBpjsTenagaKerjaComponent, listOfBpjsTenagaKerjaTemplateDetails, generalHelper }
    res.render('pages/bpjs-tenaga-kerja-template/edit', param)
}

const insertBpjsTenagaKerjaTemplateHeader = async (req, res) => {
    const { template_name } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const insertData = await prisma.templateBpjsTenagaKerjaHeader.create({
        data: {
            templateName: template_name,
            createdBy,
            updatedBy,
        }       
    })

    if (insertData) {
        res.redirect('back');
    }
}

const updateBpjsTenagaKerjaTemplateHeader = async (req, res) => {
    const { template_uuid, template_name, is_active } = req.body;
    const updatedBy = req.user.fullName;

    const updateData = await prisma.templateBpjsTenagaKerjaHeader.update({
        where: {
            uuid: template_uuid,
        },
        data: {
            templateName: template_name,
            isActive: Number(is_active),
        }
    })

    if (updateData) {
        res.redirect('back');
    }
}

const insertBpjsTenagaKerjaComponents = async (req, res) => {
    const { component_id, bpjs_tk_template_id, component_code, component_name, salary_template_id } =  req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const getDataBpjsTkComponent = await prisma.bpjsTenagaKerjaComponent.findFirst({
        where: {
            id: Number(component_id),
        }
    })

    logger.debug(getDataBpjsTkComponent);

    const insertDataSalaryTemplateDetails = await prisma.templateBpjsTenagaKerjaDetails.create({
        data: {
            salaryTemplateId: Number(salary_template_id),
            bpjsTenagaKerjaTemplateId: Number(bpjs_tk_template_id),
            componentId: Number(component_id),
            componentCode: component_code,
            componentName: component_name,
            percentage: getDataBpjsTkComponent.percentage,
            minimumWages: getDataBpjsTkComponent.minimumWages,
            maximumWages: getDataBpjsTkComponent.maximumWages,
            formula: getDataBpjsTkComponent.formula,
            sequence: getDataBpjsTkComponent.sequence,
            isTakeHomePay: getDataBpjsTkComponent.isTakeHomePay,
            createdBy,
            updatedBy
        }
    })

    if(insertDataSalaryTemplateDetails) {
        res.redirect('back');
    }
}

const deleteOfBpjsTenagaKerjaTemplateDetails =  async (req, res) => {
    const { template_uuid } = req.body;

    const deleteData = await prisma.templateBpjsTenagaKerjaDetails.delete({
        where: {
            uuid: template_uuid,
        }
    })

    if(deleteData) {
        res.redirect('back');
    }
}

module.exports = {
    showBpjsTenagaKerjaTemplate,
    showAddBpjsTenagaKerjaTemplate,
    insertBpjsTenagaKerjaTemplateHeader,
    showAddBpjsTenagaKerjaComponents,
    insertBpjsTenagaKerjaComponents,
    updateBpjsTenagaKerjaTemplateHeader,
    deleteOfBpjsTenagaKerjaTemplateDetails,
}