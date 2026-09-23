const prisma = require('../libs/prisma');
const moment = require('moment');

async function getTotalDayOfCalendar(startDate, days) {
    let totalDays = 0;
    let eventDate;
    let eventDay;
    
    const getSetupSystem = await prisma.setupSystem.findFirst({
        select: {
            workDays: true,
        }
    })

    let workDays = 5;
    if (getSetupSystem) 
        workDays = getSetupSystem.workDays;

    for (let i = 0; i < days; i++) {
        if (i == 0) {
            eventDate = startDate;
        } else {
            eventDate = moment.utc(startDate,'YYYY-MM-DD').add(i,'days').toDate('YYYY-MM-DD');;
        }
        eventDay = moment.utc(eventDate).format('dddd');
        
        if (workDays == 5) {
            if (eventDay == 'Saturday' || eventDay == 'Sunday') {
                totalDays++;
            } else {
                const getDataCalendar = await prisma.setupCalendar.findFirst({
                    where: {
                        is_workdays: 0,
                        eventDate: moment.utc(eventDate).toDate(),
                    }
                })    
                if (getDataCalendar != null) {
                    totalDays++;
                }
            }    
        } else {
            if (eventDay == 'Sunday') {
                totalDays++;
            } else {
                const getDataCalendar = await prisma.setupCalendar.findFirst({
                    where: {
                        is_workdays: 0,
                        eventDate: moment.utc(eventDate).toDate(),
                    }
                })    
                if (getDataCalendar != null) {
                    totalDays++;
                }
            }    
        }
    }

    return totalDays;
}

module.exports = { getTotalDayOfCalendar };
