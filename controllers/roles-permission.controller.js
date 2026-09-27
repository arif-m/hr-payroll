const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');
const rpTree = require('../public/js/roles-permission-tree');


const listingRolesPermission = async (req, res) => {
    const rolesUuid = req.params.rolesUuid;
    const getRoles = await listRolesPermission(rolesUuid);
    if (getRoles.status == true) {
        res.status(200).send({
            getRoles
        });       
    } else {
        res.status(404).send({
            status: true,
            statusCode: 404,
            message: 'Get data detail unsuccessfully',
            data: []
        });  
    }
}

const showRolesPermission = async (req, res) => {
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

    let param = { user: userInfo, pageTitle: "Roles Permission", getRoles, listOfRoles: listOfRoles };
    res.render('pages/roles-permission/index', param);
}

const editRolesPermission = async (req, res) => {
    const rolesUuid = req.params.rolesId;
    const getRolesId = await prisma.roles.findFirst({
        where: {
            uuid: rolesUuid,
        },
        select: {
            id: true,
            roleName:true,
        }
    })

    if(getRolesId == null) {
        return 'Get data unsuccessfully';
    }

    const roleId = getRolesId.id;    
    const roleName = getRolesId.roleName
    //const getDataModulePermissionByRoles =  await prisma.$queryRaw`SELECT module.id, module.uuid, feature, description, uri, roleId, parentId, treeStatus, icon, sequence FROM module JOIN modulePermission ON module.id = modulePermission.modulId WHERE roleId=${roleId} AND isVisible = 1 order by module.id`;
    const getDataModule =  await prisma.$queryRaw`SELECT module.id, module.uuid, feature, description, uri, parentId, treeStatus, icon, sequence FROM module WHERE isVisible = 1 order by sequence, module.id`;        

    let moduleId;
    for (var i = 0; i < getDataModule.length; i++){
        moduleId = getDataModule[i].id;
        const getDataModulePermissionByRoles = await prisma.modulePermission.findFirst({
            where: {
                modulId: moduleId,
                roleId: roleId,
            },
            select: {
                uuid: true,
                createRight: true,
                readRight: true,
                updateRight: true,
                deleteRight: true,
                inactiveRight: true,
            }
        })
        if(getDataModulePermissionByRoles) {
            getDataModule[i].uuid = getDataModulePermissionByRoles.uuid;
            getDataModule[i].createRight = getDataModulePermissionByRoles.createRight;
            getDataModule[i].readRight = getDataModulePermissionByRoles.readRight;
            getDataModule[i].updateRight = getDataModulePermissionByRoles.updateRight;
            getDataModule[i].deleteRight = getDataModulePermissionByRoles.deleteRight;
            getDataModule[i].inactiveRight = getDataModulePermissionByRoles.inactiveRight;    
        }
    }

    // Urutkan depth-first agar anak kontigu di bawah parentnya (data DB
    // berurutan global by sequence sehingga anak/keponakan bisa berselang).
    // Depth & jumlah keturunan dihitung dari urutan hasil untuk rendering tree.
    const treeRows = rpTree.toDepthFirstRows(getDataModule);
    const rpDepth = rpTree.computeDepth(treeRows);
    const rpDescendants = {};
    treeRows.forEach(function (m) {
        rpDescendants[m.id] = rpTree.countDescendants(treeRows, m.id);
    });

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, pageTitle: "Roles Permission", getRoles, roleId, roleName, listOfRolesPermission: treeRows, rpDepth, rpDescendants };
    res.render('pages/roles-permission/edit', param);
}

const updateRolesPermission = async (req, res) => {
    let uuid;                             
    let data = {};
    let roleId = req.body.roleId;
    let moduleId;
    const updatedBy = req.user.fullName;
    const totalRow = req.body.uuid.length;
    for(var i = 0; i < totalRow; ++i) {
        uuid = req.body.uuid[i];
        moduleId = req.body.moduleId[i];
        if (req.body.createRight[i] == 1){
            data.createRight = Number(req.body.createRight[i]);
        } else
            data.createRight = 0;

        if (req.body.readRight[i] == 1){
            data.readRight = Number(req.body.readRight[i]);
        } else
            data.readRight = 0;

        if (req.body.updateRight[i] == 1){
            data.updateRight = Number(req.body.updateRight[i]);
        } else
            data.updateRight = 0;

        if (req.body.deleteRight[i] == 1){
            data.deleteRight = Number(req.body.deleteRight[i]);
        } else
            data.deleteRight = 0; 
        
        if (req.body.inactiveRight[i] == 1){
            data.inactiveRight = Number(req.body.inactiveRight[i]);
        } else 
            data.inactiveRight = 0;

        data.updatedBy = updatedBy;

        const isExistDataModulePermission = await prisma.modulePermission.findFirst({
            where: {
                roleId: Number(roleId),
                modulId: Number(moduleId),
            },
            select: {
                uuid: true,
            }
        })

        if(isExistDataModulePermission){
            const updateModulePermission = await prisma.modulePermission.update({
                where: {
                    uuid: uuid,
                },
                data
            })
        } else {
            data.roleId = Number(roleId);
            data.modulId = Number(moduleId);
            data.createdBy = updatedBy;
            const insertDataModulePermission = await prisma.modulePermission.create({
                data
            })
        }
        data = {};
    }
    req.flash('success', 'Update roles permission successfully !!');
    res.redirect('/roles-permission');    
}

module.exports = {
    listingRolesPermission,
    showRolesPermission,
    editRolesPermission,
    updateRolesPermission,
}