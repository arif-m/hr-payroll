const prisma = require('../libs/prisma');
const moment = require('moment');

async function listOfHolidaysCalendar() {
    const thisYear = moment().format('YYYY');
    const startDate = new Date(thisYear+"-01-01");
    const endDate = new Date(thisYear+"-12-31");
    const getDataCalendar = await prisma.setupCalendar.findMany({
        where:{
            eventDate: {
                gte: startDate, //new Date("2022-01-01"),
                lt:  endDate, //new Date("2022-12-31")
            },
            is_workdays: 0,
        },
        select: {
            eventDate: true,
        }
    });

    if (getDataCalendar) {
        return {
            status: true,
            statusCode: 200,
            message: 'Get data successfully',
            data: getDataCalendar
        };   
    } else {
        return {
            status: false,
            statusCode: 404,
            message: 'Get data unsuccessfully',
            data: []
        } ;  
    }
}

module.exports = {
    listOfHolidaysCalendar,
}