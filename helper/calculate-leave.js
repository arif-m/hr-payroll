const prisma = require('../libs/prisma');
const moment = require('moment');
let logger = require('../libs/logger');

async function calculateAnnualLeave() {
    let createdBy = 'system';
    let updatedBy = 'system';

    const getSetupAnnualLeave = await prisma.setupAnnualLeave.findFirst({
        select: {
            timeOffPerYear: true,
            timeOffPerMonth: true,
            additionalTimeOff: true,
            defaultCalculation: true,
        }
    })

    let timeOf = 1;
    let additionalTimeOff = 0;
    if (getSetupAnnualLeave) {
        if (getSetupAnnualLeave.defaultCalculation == 'Monthly') {
            timeOf = getSetupAnnualLeave.timeOffPerMonth;
            additionalTimeOff = getSetupAnnualLeave.additionalTimeOff;    
        } else {
            timeOf = getSetupAnnualLeave.timeOffPerYear;
            additionalTimeOff = getSetupAnnualLeave.additionalTimeOff;    
        }
    }

    const getEmployee = await prisma.users.findMany({
        where: {
            AND: [
                //{ roleId: 1},
                { employmentStatus: 'Permanent' },
                { status: 'Active' },    
            ]
        }
    })

    const getCurrentMonth = moment().format('M');
    const getCurrentYear = moment().format('Y');
    let monthOfJoinDate;
    let annualLeave = 0;
    for (let index = 0; index < getEmployee.length; ++index) {
        const employee = getEmployee[index];
        const isExistEmployeeAnnualLeave = await prisma.employeeAnnualLeave.findFirst({
            where: {
                employeeId: Number(employee.id),
                Period: Number(getCurrentMonth),
                year: Number(getCurrentYear),
            },
            select: {
                id: true,
            }
        })

        monthOfJoinDate = moment(employee.joinDate).format('M');
        yearOfJoinDate = moment(employee.joinDate).format('Y');
        if (monthOfJoinDate == getCurrentMonth) {
            annualLeave = Number(timeOf) + Number(additionalTimeOff);
            if (!isExistEmployeeAnnualLeave) {
                const insertEmployeeAnnualLeave = await prisma.employeeAnnualLeave.create({
                    data: {
                        employeeId: Number(employee.id),
                        Period: Number(getCurrentMonth),
                        day: annualLeave,
                        year: Number(getCurrentYear),
                        remarks: 'annual',
                        createdBy,
                        updatedBy,
                    }
                })    
            }
    
            const updateEmploymentStatus = await prisma.users.update({
                where : {
                    uuid: employee.uuid,
                },
                data: {
                    annualLeaveBalance: annualLeave,
                    annualLeave: 0,
                }
            })   
        } else {
            annualLeave = Number(timeOf);
            if (!isExistEmployeeAnnualLeave) {
                const insertEmployeeAnnualLeave = await prisma.employeeAnnualLeave.create({
                    data: {
                        employeeId: Number(employee.id),
                        Period: Number(getCurrentMonth),
                        day: annualLeave,
                        year: Number(getCurrentYear),
                        remarks: 'annual',
                        createdBy,
                        updatedBy,
                    }
                })    
            }

            const updateEmploymentStatus = await prisma.$executeRaw`UPDATE users SET annualLeaveBalance = annualLeaveBalance + ${annualLeave} WHERE uuid = ${employee.uuid};`
        } 
    }
    console.log('Calculate annual leave successfully')
}

async function calculateSickLeave() {
    const createdBy = 'system';
    const updatedBy = 'system';

    const getSetupSickLeave = await prisma.setupSickLeave.findFirst({
        where: {
            name: 'init',
        },
        select: {
            day: true,
        }
    })

    let dayOfSickLeave = 2;
    if (getSetupSickLeave) {
        dayOfSickLeave = getSetupSickLeave.day;
    }

    const getEmployee = await prisma.users.findMany({
        where: {
            AND: [
                //{ roleId: 1},
                { employmentStatus: 'Permanent' },
                { status: 'Active' },    
            ]
        }
    })

    const getCurrentMonth = moment().format('M');
    const getCurrentYear = moment().format('Y');
    for (let index = 0; index < getEmployee.length; ++index) {
        const employee = getEmployee[index];

        const isExistEmployeeSickLeave = await prisma.employeeSickLeave.findFirst({
            where: {
                employeeId: Number(employee.id),
                Period: Number(getCurrentMonth),
                year: Number(getCurrentYear),
            },
            select: {
                id: true,
            }
        })

        if (!isExistEmployeeSickLeave) {
            const insertEmployeeSickLeave = await prisma.employeeSickLeave.create({
                data: {
                    employeeId: Number(employee.id),
                    Period: Number(getCurrentMonth),
                    year: Number(getCurrentYear),
                    day: dayOfSickLeave,
                    createdBy: createdBy,
                    updatedBy: updatedBy,
                }
            })    
        }

        const updateEmployeeSickLeave = await prisma.users.update({
            where: {
                uuid: employee.uuid,
            },
            data: {
                sickLeaveBalance: dayOfSickLeave,
                sickLeave: 0,
            }
        }) 
    }
    console.log('Calculate sick leave successfully');
}

module.exports = { calculateAnnualLeave, calculateSickLeave };