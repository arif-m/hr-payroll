const prisma = require('../libs/prisma');

const { listRolesPermission } = require('../helper/roles-permission');

const showIndex = async (req, res) => {
    const query = req.query;
    let search = query.search;
    let where = {};
    if (query.search){
        where = { description : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.otherLeaveType.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataOtherLeaveType = await prisma.otherLeaveType.findMany({
        skip: skip,
        take: limit,
        where,
    })

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfOtherLeaveType = { meta : metaDataRoles, data: getDataOtherLeaveType};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, pageTitle: "Other Leave Type", getRoles, listOfOtherLeaveType: listOfOtherLeaveType };
    res.render('pages/other-leave-type/index', param);
}

const createDataOtherLeaveType = async (req, res) => {
    const { description, limit} = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const insertData = await prisma.otherLeaveType.create({
        data: {
            description,
            limit: Number(limit),
            createdBy,
            updatedBy,
        }
    })

    if (insertData) {
        res.redirect('back');
    }
}

const updateDataOtherLeaveType = async (req, res) => {
    const { description, limit, id } = req.body;
    const updatedBy = req.user.fullName;

    const updateData = await prisma.otherLeaveType.update({
        where: {
            id: Number(id),
        },
        data: {
            description: description,
            limit: Number(limit),
            updatedBy,
        }
    })

    if (updateData) {
        res.redirect('back');
    }

}

const deleteDataOtherLeaveType = async (req, res) => {
    const id = req.body.id;

    const findOtherLeaveOnRequestOtherLeave = await prisma.requestOtherLeave.findFirst({
        where: {
            otherLeaveType: Number(id),
        },
        select: {
            id: true,
            employeeId: true,
        }
    })
    if (findOtherLeaveOnRequestOtherLeave != null) {
        req.flash('errorDelete', 'Data already used by other transaction !!!')
        res.redirect('back');
        return 'ada data'
    }

    const deleteData = await prisma.otherLeaveType.delete({
        where : {
            id: Number(id),
        }
    })
    res.redirect('back');
}

module.exports = {
    showIndex,
    createDataOtherLeaveType,
    updateDataOtherLeaveType,
    deleteDataOtherLeaveType
}