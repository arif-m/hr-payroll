var logger = require('../libs/logger'),
    csrf = require('../libs/csrf'),
    csrfProtection = csrf({
      cookie: true
    });

const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');


const listDivision = async (req, res) => {
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search){
        where = { divisionName : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.division.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataDivision = await prisma.division.findMany({
        skip: skip,
        take: limit,
        where,
    })

    const metaDataDision = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfDivision = { meta : metaDataDision, data: getDataDivision};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/division/index', { user: userInfo, getRoles, search, pageTitle: 'Division', listOfDivision: listOfDivision });

    /*
    res.status(200).send({
        status: true,
        statusCode: 200,
        message: 'Data listing successfully',
        data: listOfDivision
    }); */
}

const createDivision = async (req, res) => {
    const { division_name } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const insertDivision = await prisma.division.create({
        data: {
            divisionName: division_name,
            createdBy: createdBy,
            updatedBy: updatedBy
        }
    })

    if (insertDivision){
        res.redirect('back');
    }
}

const updateDivision = async (req, res) => {
    const { division_name } = req.body;
    const id = parseInt(req.body.division_id);
    const updatedBy = req.user.fullName;

    const updateData = await prisma.division.update({
        where : {
            id: id
        },
        data: {
            divisionName: division_name,
            updatedBy: updatedBy,
        }
    })

    res.redirect('back');
}

const deleteDivision = async (req, res) => {
    const divisionId = parseInt(req.body.division_id);

    const isExistDivisionOnEmployee = await prisma.users.findFirst({
        where: {
            divisionId: divisionId,
        }
    })

    if(isExistDivisionOnEmployee){
        req.flash('errorDelete', 'Data already used by employee !!');
        res.redirect('back');
    }

    const deleteData = await prisma.division.delete({
        where : {
            id: divisionId
        }
    })
    res.redirect('back');
}

module.exports = {
    listDivision,
    createDivision,
    updateDivision,
    deleteDivision,
}
