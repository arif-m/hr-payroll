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

    const totalCount = await prisma.medicalReimbursementCategory.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataMedicalReimbursementCategory = await prisma.medicalReimbursementCategory.findMany({
        skip: skip,
        take: limit,
        where,
    })

    const metaDataRoles = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfMedicalReimbursementCategory = { meta : metaDataRoles, data: getDataMedicalReimbursementCategory};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, pageTitle: "Medical Reimbursement Category", getRoles, listOfMedicalReimbursementCategory: listOfMedicalReimbursementCategory };
    res.render('pages/medical-reimbursement-category/index', param);
}

const createDataMedicalReimbursementCategory = async (req, res) => {
    const { description, percentage} = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const insertData = await prisma.medicalReimbursementCategory.create({
        data: {
            description,
            percentage: Number(percentage),
            createdBy,
            updatedBy,
        }
    })

    if (insertData) {
        res.redirect('back');
    }
}

const updateDataMedicalReimbursementCategory = async (req, res) => {
    const { description, percentage, id, is_active } = req.body;
    const updatedBy = req.user.fullName;

    const updateData = await prisma.medicalReimbursementCategory.update({
        where: {
            id: Number(id),
        },
        data: {
            description: description,
            percentage: Number(percentage),
            isActive: Number(is_active),
            updatedBy,
        }
    })

    if (updateData) {
        res.redirect('back');
    }
}

const deleteDataMedicalReimbursementCategory = async (req, res) => {
    const id = req.body.id;

    const deleteData = await prisma.medicalReimbursementCategory.delete({
        where : {
            id: Number(id),
        }
    })
    res.redirect('back');
}

module.exports = {
    showIndex,
    createDataMedicalReimbursementCategory,
    updateDataMedicalReimbursementCategory,
    deleteDataMedicalReimbursementCategory
}