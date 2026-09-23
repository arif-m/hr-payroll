var logger = require('../libs/logger'),
    csrf = require('../libs/csrf');

const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');

const moment = require('moment');
const { listOfHolidaysCalendar } = require('../helper/calendar');

const listOfCalendar = async (req, res) => {
    const query = req.query;
    let search = query.search;
    where = {};
    if (query.search){
        where = { eventName : {
                    contains: search                    
                },
            }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.setupCalendar.count({ where, });
    const totalPage = Math.ceil(totalCount / limit);
    const currentPage = page || 0;

    const getDataCalendar = await prisma.setupCalendar.findMany({
        skip: skip,
        take: limit,
        where,
    })

    const metaData= { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount};
    const listOfCalendar = { meta : metaData, data: getDataCalendar};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    const param = { user: userInfo, moment: moment, getRoles, search, pageTitle: 'Calendar', listOfCalendar: listOfCalendar };    
    res.render('pages/calendar/index', param);
}

const createCalendar = async (req, res) => {
    const { event_date, event_name, description, is_workdays } = req.body;
    const eventDate = event_date.split("-")[2] + '-' + event_date.split("-")[1] + '-' + event_date.split("-")[0];

    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const insertDataCalendar = await prisma.setupCalendar.create({
        data: {
            eventDate: moment.utc(eventDate).toDate(),
            eventName: event_name,
            description: description,
            is_workdays: Number(is_workdays),
            createdBy: createdBy,
            updatedBy: updatedBy,
        }
    })

    if (insertDataCalendar) {
        res.redirect('back');
    }
}

const updateCalendar = async (req, res) => {
    const { event_uuid, event_date, event_name, description, is_workdays } = req.body;
    const eventDate = event_date.split("-")[2] + '-' + event_date.split("-")[1] + '-' + event_date.split("-")[0];
    const updatedBy = req.user.fullName;

    const updateDataCalendar = await prisma.setupCalendar.update({
        where: {
            uuid: event_uuid,
        },
        data: {
            eventDate: moment.utc(eventDate).toDate(),
            eventName: event_name,
            description: description,
            is_workdays: Number(is_workdays),
            updatedBy: updatedBy,
        }
    })

    if (updateDataCalendar) {
        res.redirect('back');
    }
}

const deleteCalendar = async (req, res) => {
    const { event_uuid } = req.body;
    const deleteData = await prisma.setupCalendar.delete({
        where: {
            uuid: event_uuid,
        }
    })

    if (deleteData) {
        res.redirect('back');
    }
}

const myCalendar = async (req, res) => {
    try {
        const userInfo = req.user;
        const getRoles = await listRolesPermission(userInfo.roleUuid);
        const thisYear = moment().format('YYYY');
        const startDate = new Date(thisYear+"-01-01");
        const endDate = new Date(thisYear+"-12-31");
        const listOfCalendar = await prisma.setupCalendar.findMany({
            where:{
                eventDate: {
                    gte: startDate, //new Date("2022-01-01"),
                    lt:  endDate, //new Date("2022-12-31")
                },
            },
            select: {
                eventDate: true,
                eventName: true,
                description: true,
                is_workdays: true,
            },
            orderBy: {
                eventDate: 'asc',
            }
        });
    
        const param = { user: userInfo, moment: moment, getRoles, pageTitle: 'Show Calendar', listOfCalendar };    
        res.render('pages/calendar/my-calendar', param);
    } catch (error) {
        console.log(error);
        res.redirect('back');
    }
}

const showHolidaysCalendar = async (req, res) => {
    try {
        const listOfHolidayCalendar = await listOfHolidaysCalendar();
        if (listOfHolidayCalendar.data.length > 0) {
            res.status(200).send({
                status: true,
                statusCode: 200,
                message: 'Get data successfully',
                data: listOfHolidayCalendar.data
            });      
        } else {
            res.status(404).send({
                status: true,
                statusCode: 404,
                message: 'Get data unsuccessfully',
                data: []
            });      
        }            
    } catch (error) {
        console.log(error);
        res.status(403).send({
            status: true,
            statusCode: 403,
            message: error.message,
            data: []
        });  
    }
}

module.exports = { 
    listOfCalendar, 
    createCalendar, 
    updateCalendar, 
    deleteCalendar ,
    myCalendar,
    showHolidaysCalendar,
}