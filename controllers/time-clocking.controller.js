const prisma = require('../libs/prisma');

const moment = require('moment');

const showTimeClocking =  async (req, res) => {
    let today = moment.utc().format('dddd, DD MMM YYYY');
    param = { today, moment, pageTitle : 'Time Clocking' }
    res.render('pages/time-clocking/index', param);
}

const processCheckIn =  async (req, res) => {
    const id = req.body.employee_id;   
    const today = moment.utc().format('YYYY-MM-DD'); 
    const isExistCheckInEmployee = await prisma.timeAttendance.findFirst({
        where: {
            employeeId: Number(id),
            workDate: moment.utc(today).toDate(),
        },
        select: {
            id: true,
        }
    })

    if (isExistCheckInEmployee) {
        req.flash('error', 'You already clock in !!!');
        res.redirect('back');
        return;
    }

    const getDataEmployee = await prisma.users.findFirst({
        where: {
            id: Number(id),
        },
        select: {
            id: true,
            employeeId: true,
            fullName: true,
            businessUnit: {
                select: {
                  id: true,
                  businessUnitName: true,
                },
            },
            division: {
                select: {
                  id: true,
                  divisionName: true,
                },
            },
            jobTitle: {
                select: {
                  id: true,
                  jobTitleName: true,
                },
            },
        }
    })

    if (getDataEmployee) {
        const createdBy = getDataEmployee.fullName;
        const updatedBy = getDataEmployee.fullName;
    
        employeeId = getDataEmployee.employeeId;
        const insertData = await prisma.timeAttendance.create({
            data: {
                employeeId: Number(id),
                workDate: moment().toDate(),
                status: 'P',
                checkIn: moment().utc().format('YYYY-MM-DDTHH:mm:ss') + '.000Z',
                fullName: getDataEmployee.fullName,
                businessUnitId: getDataEmployee.businessUnit.id,
                businessUnitName: getDataEmployee.businessUnit.businessUnitName,
                divisionId: getDataEmployee.division.id,
                divisionName: getDataEmployee.division.divisionName,
                jobTitleId: getDataEmployee.jobTitle.id,
                jobTitleName: getDataEmployee.jobTitle.jobTitleName,
                createdBy,
                updatedBy,
            }
        })
        req.flash('success', 'Clock In sucessfully...');
        res.redirect('back');
    }
    req.flash('error', 'Employee not found !!!')
    res.redirect('/time-clocking');
}

const processCheckOut =  async (req, res) => {
    const id = req.body.employee_id;
    const today = moment.utc().format('YYYY-MM-DD'); 
    const isExistCheckInEmployee = await prisma.timeAttendance.findFirst({
        where: {
            employeeId: Number(id),
            workDate: moment.utc(today).toDate(),
        },
        select: {
            id: true,
            checkOut: true,
        }
    })

    if (isExistCheckInEmployee) {
        if (isExistCheckInEmployee.checkOut === null) {
            const updateData = await prisma.timeAttendance.update({
                where: {
                    id: Number(isExistCheckInEmployee.id),
                    //workDate: moment.utc(today).toDate(),
                },
                data: {
                    checkOut: moment().utc().format('YYYY-MM-DDTHH:mm:ss') + '.000Z',
                }
            })
            req.flash('success', 'Clock Out sucessfully...');
            res.redirect('back');
        } else {
            req.flash('error', 'You already clock out !!!')
            res.redirect('/time-clocking');        
        }
    } else {
        req.flash('error', 'Please, clock in first !!!')
        res.redirect('/time-clocking');    
    }
}

module.exports = {
    showTimeClocking,
    processCheckIn,
    processCheckOut,
}