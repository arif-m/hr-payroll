var logger = require('../libs/logger'),
    csrf = require('../libs/csrf'),
    csrfProtection = csrf({
      cookie: true
    });

const prisma = require('../libs/prisma');
const { resolveTypeReferenceDirective } = require('typescript');
const { listRolesPermission } = require('../helper/roles-permission');


const listJobtitles = async (req, res) => {
    const query = req.query;
    let search = query.search;
    let where = {};
    if (query.search){
        where = { jobTitleName : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.jobTitle.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataJobTitles = await prisma.jobTitle.findMany({
        skip: skip,
        take: limit,
        where,
    });
    const metaDataDision = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage };
    const listOfJobtitles = { meta : metaDataDision, data: getDataJobTitles };

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/jobtitles/index', { user: userInfo, getRoles, search, pageTitle: 'Jobtitles', listOfJobtitles: listOfJobtitles });

    /*
    res.status(200).send({
        status: true,
        statusCode: 200,
        message: 'Data listing successfully',
        data: listOfJobtitles
    }); */
}

const createJobtitles = async (req, res) => {
    const { jobtitles_name } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const insertJobtitles = await prisma.jobTitle.create({
        data: {
            jobTitleName: jobtitles_name,
            createdBy: createdBy,
            updatedBy: updatedBy
        }
    })

    if (insertJobtitles){
        res.redirect('back');
    }
}

const updateJobtitles = async (req, res) => {
    const { jobtitles_name } = req.body;
    const id = parseInt(req.body.jobtitles_id);
    const updatedBy = req.user.fullName;

    const updateData = await prisma.jobTitle.update({
        where : {
            id: id
        },
        data: {
            jobTitleName: jobtitles_name,
            updatedBy: updatedBy,
        }
    })

    const listOfJobtitles = await prisma.jobTitle.findMany();
    /*res.status(200).send({
        status: true,
        statusCode: 200,
        message: 'Update data successfully',
        data: listOfJobtitles
    }); */

    res.redirect('back');
}

const deleteJobtitles = async (req, res) => {
    const jobTitlesId = parseInt(req.body.jobtitles_id);

    const isExistJobTitlesOnEmployee = await prisma.users.findFirst({
        where: {
            jobTitleId: jobTitlesId,
        }
    })

    if (isExistJobTitlesOnEmployee){
        req.flash('errorDelete', 'Data already used by employee !!');
        res.redirect('back');
    }

    const deleteData = await prisma.jobTitle.delete({
        where : {
            id: jobTitlesId
        }
    })

    res.redirect('back');
}

module.exports = {
    listJobtitles,
    createJobtitles,
    updateJobtitles,
    deleteJobtitles,
}
