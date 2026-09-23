const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');

const generalHelper = require('../helper/general');

const listingAllPkp = async (req, res) => {
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

    const totalCount = await prisma.pkp.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataPkp = await prisma.pkp.findMany({
        skip: skip,
        take: limit,
        where,
    })

    const metaDataPkp = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOfPkp = { meta : metaDataPkp, data: getDataPkp};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);    

    param = { user: userInfo, getRoles, search, pageTitle : 'PKP', listOfPkp, generalHelper}
    res.render('pages/pkp/index', param);
}

const createDataPkp = async(req, res) => {
    try {
        const { code, description, start_salary, end_salary, rates_percentage } = req.body;
        const createdBy = req.user.fullName;
        const updatedBy = req.user.fullName;
    
        const inserDataPkp = await prisma.pkp.create({
            data: {
                code: code,
                description: description,
                startSalary: parseFloat(generalHelper.formatNumberWithoutDelimiter(start_salary)),
                endSalary: parseFloat(generalHelper.formatNumberWithoutDelimiter(end_salary)),
                ratesPercentage: Number(rates_percentage),
                createdBy,
                updatedBy,
            }
        })
    
        if (inserDataPkp) {
            res.redirect('back');
        }
    } catch (err) {
        console.log(err.message);
        req.flash('error', err.message);
        res.redirect('back')
    }

}

const updateDataPkp = async (req, res) => {
    try {
        const { pkp_id, code, description, start_salary1, end_salary1, rates_percentage1 } = req.body;
        const updatedBy = req.user.fullName;
        const updateDataPkp = await prisma.pkp.update({
            where: {
                id: Number(pkp_id),
            },
            data: {
                code: code,
                description: description,
                startSalary: parseFloat(generalHelper.formatNumberWithoutDelimiter(start_salary1)),
                endSalary: parseFloat(generalHelper.formatNumberWithoutDelimiter(end_salary1)),
                ratesPercentage: Number(rates_percentage1),
                updatedBy,
            }
        })
    
        if (updateDataPkp) {
            res.redirect('back');
        }
    } catch (error) {
        console.log(err.message);
        req.flash('error', err.message);
        res.redirect('back')
    }

}

const deleteDataPkp = async (req, res) => {
    const { pkp_id } = req.body;

    const deleteData = await prisma.pkp.delete({
        where: {
            id: Number(pkp_id),
        }
    })
    if(deleteData) {
        res.redirect('back');
    }
}

module.exports = {
    listingAllPkp,
    createDataPkp,
    updateDataPkp,
    deleteDataPkp,
}