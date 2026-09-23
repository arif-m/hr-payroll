const prisma = require('../libs/prisma');
const moment = require('moment');

function formatNumberWithCommas (numberParam) {
    return numberParam.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    //return String(numberParam).replace(/(.)(?=(\d{3})+$)/g,'$1,');
}

function formatNumberWithoutDelimiter (numberParam) {
    return Number(numberParam.toString().replace(/\,/g,''));
}

async function isExistTimeAttendanceEmployee (employeeId, workDate) {
    const getTimeAttendanceEmployee = await prisma.timeAttendance.findFirst({
        where: {
            employeeId: Number(employeeId),
            workDate: moment.utc(workDate).toDate(),
        },
        select: {
            id: true,
        }
    })

    //console.log(getTimeAttendanceEmployee);
    if (getTimeAttendanceEmployee) {
        return true;
    } else {
        return false;
    }
    
}

module.exports = { 
    formatNumberWithCommas, 
    formatNumberWithoutDelimiter,
    isExistTimeAttendanceEmployee,
}