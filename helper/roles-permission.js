const prisma = require('../libs/prisma');

async function listRolesPermission (uuid) {
    const rolesUuid = uuid;
    const getRoles = await prisma.roles.findFirst({
        where: {
            uuid: rolesUuid,
        },
        select: {
            id: true,
        }
    })

    if(getRoles == null) {
        return 'Get data unsuccessfully';
    }

    const roleId = getRoles.id;
    const getDataRolesPermission =  await prisma.$queryRaw`SELECT module.id, module.uuid, feature, description, uri, roleId, parentId, icon, sequence FROM module JOIN modulePermission ON module.id = modulePermission.modulId WHERE roleId=${roleId} AND isVisible = 1 AND readRight=1 ORDER BY sequence`;
    if ( getDataRolesPermission.length < 1 ||  getDataRolesPermission == undefined) {
        return {
            'status': false,
            'statusCode': 404,
            'message': 'Get data unsuccessfully', 
            'data': []
        }
    }
    let buildTreeData = function (getDataRolesPermission, root) {
        var t = {};
        getDataRolesPermission.forEach(o => {
            Object.assign(t[o.id] = t[o.id] || {}, o);
            t[o.parentId] = t[o.parentId] || {};
            t[o.parentId].children = t[o.parentId].children || [];
            t[o.parentId].children.push(t[o.id]);
        });
        return t[root].children;
    }(getDataRolesPermission, 0);
    
    if(getDataRolesPermission != "null"){
        return {
            'status': true,
            'statusCode': 200,
            'message': 'Get data successfully',
            'data': buildTreeData
        };
    } else {
        return {
            'status': false,
            'statusCode': 404,
            'message': 'Get data unsuccessfully', 
            'data': []
        }
    }
}

module.exports = {
    listRolesPermission,

}