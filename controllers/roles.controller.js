var logger = require('../libs/logger'),
    csrf = require('../libs/csrf');

const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');


const listRoles = async (req, res) => {
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search){
        where = { roleName : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.roles.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataRoles = await prisma.roles.findMany({
        skip: skip,
        take: limit,
        where,
    })

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfRoles = { meta : metaDataRoles, data: getDataRoles};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/roles/index', { user: userInfo, getRoles, search, pageTitle: 'Roles', listOfRoles });
}

const createRoles = async (req, res) => {
    const { role_name } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const insertRolesData = await prisma.roles.create({
        data: {
            roleName: role_name,
            createdBy: createdBy,
            updatedBy: updatedBy
        }
    })

    if (insertRolesData){
        res.redirect('back');
    }
}

const updateRoles = async (req, res) => {
    const { role_uuid, role_name, role_name2 } = req.body;
    const id = parseInt(req.body.role_id);
    const updatedBy = req.user.fullName;

    if (role_name2 == 'Super Admin') {
        res.redirect('back');
    }
    
    const updateRolesData = await prisma.roles.update({
        where : {
            uuid: role_uuid,
        },
        data: {
            roleName: role_name,
            updatedBy: updatedBy,
        }
    })

    res.redirect('back');
}

const deleteRoles = async (req, res) => {
    const { role_uuid } = req.body;
    const roleId = parseInt(req.body.role_id);

    const isExistRolesOnRolesPermission = await prisma.modulePermission.findFirst({
        where: {
            roleId: roleId            
        }
    })

    if(isExistRolesOnRolesPermission){
        req.flash('errorDelete', 'Data already used by roles permission !!');
        res.redirect('back');
    }

    const deleteRolesData = await prisma.roles.delete({
        where : {
            uuid: role_uuid
        }
    })
    res.redirect('back');
}

module.exports = {
    listRoles,
    createRoles,
    updateRoles,
    deleteRoles,
}
