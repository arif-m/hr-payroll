const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');

const moment = require('moment');
const generalHelper = require('../helper/general');

const showBpjsTenagaKerjaComponent = async (req, res) => {
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

    const totalCount = await prisma.BpjsTenagaKerjaComponent.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataBpjsTenagaKerjaComponent = await prisma.bpjsTenagaKerjaComponent.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            isActive: true,
            componentCode: true,
            componentName: true,
            percentage: true,
            minimumWages: true,
            maximumWages: true,
            formula: true,
            sequence: true,
            isTakeHomePay: true,
        }
    })

    const metaData= { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfBpjsTenagaKerjaComponent = { meta : metaData, data: getDataBpjsTenagaKerjaComponent};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'BPJS Tenaga Kerja Component', listOfBpjsTenagaKerjaComponent: listOfBpjsTenagaKerjaComponent, generalHelper }; 
    res.render('pages/bpjs-tenaga-kerja-component/index', param);
}

const createBpjsTenagaKerjaComponent = async (req, res) => {
    const { component_code, component_name, percentage, formula, is_take_home_pay, sequence } = req.body;
    let { minimum_wages, maximum_wages } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    if (!minimum_wages)
        minimum_wages = 0;
    if(!maximum_wages)
        maximum_wages = 0

    const insertDataBpjsTenagaKerjaComponent = await prisma.bpjsTenagaKerjaComponent.create({
        data: {
            componentCode: component_code,
            componentName: component_name,
            percentage: Number(percentage),
            minimumWages: Number(minimum_wages),
            maximumWages: Number(maximum_wages),
            formula: formula,
            sequence: Number(sequence),
            isTakeHomePay: Number(is_take_home_pay),
            createdBy: createdBy,
            updatedBy: updatedBy,
        }
    })

    if(insertDataBpjsTenagaKerjaComponent) {
        res.redirect('back');
    }

}

const updateBpjsTenagaKerjaComponent = async (req, res) => {
    const { component_uuid, component_code, component_name, percentage, formula, sequence, is_take_home_pay } = req.body;
    let { minimum_wages, maximum_wages } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    if (!minimum_wages)
        minimum_wages = 0;
    if(!maximum_wages)
        maximum_wages = 0

    const updateDataBpjsTenagaKerjaComponent = await prisma.bpjsTenagaKerjaComponent.update({
        where: {
            uuid: component_uuid,
        },
        data: {
            componentCode: component_code,
            componentName: component_name,
            percentage: Number(percentage),
            minimumWages: Number(minimum_wages),
            maximumWages: Number(maximum_wages),
            formula: formula,
            sequence: Number(sequence),
            isTakeHomePay: Number(is_take_home_pay),
            createdBy: createdBy,
            updatedBy: updatedBy,
        }
    })
    if (updateDataBpjsTenagaKerjaComponent) {
        res.redirect('back');
    }
}

const deleteBpjsTenagaKerjaComponent = async (req, res) => {
    const { component_uuid } = req.body;

    const deleteData = await prisma.bpjsTenagaKerjaComponent.delete({
        where: {
            uuid: component_uuid,
        }
    })

    if(deleteData){
        res.redirect('back');
    }

    req.flash('error', 'Error delete data !!!');
    res.redirect('back');
}

module.exports = { 
    showBpjsTenagaKerjaComponent, 
    createBpjsTenagaKerjaComponent, 
    updateBpjsTenagaKerjaComponent, 
    deleteBpjsTenagaKerjaComponent,
}