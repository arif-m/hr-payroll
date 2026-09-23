const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');

const generalHelper = require('../helper/general');

const listingAllPtkp = async (req, res) => {
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search){
        where = { code : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.ptkp.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }

    const currentPage = page || 0;

    const getDataPtkp = await prisma.ptkp.findMany({
        skip: skip,
        take: limit,
        where,
    })

    const metaDataPtkp = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfPtkp = { meta : metaDataPtkp, data: getDataPtkp};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    param = { user: userInfo, getRoles, search, pageTitle : 'PTKP', listOfPtkp, generalHelper}
    res.render('pages/ptkp/index', param);
}

const createDataPtkp = async(req, res) => {
    const { code, description, amount } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const inserDataPtkp = await prisma.ptkp.create({
        data: {
            code: code,
            description: description,
            amount: Number(amount),
            createdBy,
            updatedBy,
        }
    })

    if(inserDataPtkp) {
        res.redirect('back');
    }
}

const updateDataPtkp = async (req, res) => {
    const { ptkp_id, code, description, amount } = req.body;
    const updatedBy = req.user.fullName;

    const updateDataPtkp = await prisma.ptkp.update({
        where: {
            id: Number(ptkp_id),
        },
        data: {
            code: code,
            description: description,
            amount: Number(generalHelper.formatNumberWithoutDelimiter(amount)),
            updatedBy,
        }
    })

    if(updateDataPtkp){
        res.redirect('back');
    }
}

const deleteDataPtkp = async (req, res) => {
    const { ptkp_id } = req.body;

    const deleteData = await prisma.ptkp.delete({
        where: {
            id: Number(ptkp_id),
        }
    })
    if(deleteData) {
        res.redirect('back');
    }
}

module.exports = {
    listingAllPtkp,
    createDataPtkp,
    updateDataPtkp,
    deleteDataPtkp,
}