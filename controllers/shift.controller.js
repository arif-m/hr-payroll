const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');
const moment = require('moment');

/** Konversi 'HH:mm' (dari input type=time) ke Date basis 1970-01-01 UTC
 *  agar cocok dengan kolom @db.Time(0). */
function timeStringToDate(value) {
    if (!value) return null;
    const m = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return new Date(Date.UTC(1970, 0, 1, Number(m[1]), Number(m[2]), 0));
}

const listShift = async (req, res) => {
    const query = req.query;
    let search = query.search;
    let where = {};
    if (query.search) {
        where = { shiftName: { contains: search } };
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.shift.count({ where });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if (totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataShift = await prisma.shift.findMany({
        skip: skip,
        take: limit,
        where,
        orderBy: { id: 'asc' },
    })

    const metaData = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage };
    const listOfShift = { meta: metaData, data: getDataShift };

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/shift/index', { user: userInfo, getRoles, search, pageTitle: 'Shift', listOfShift: listOfShift, moment });
}

const createShift = async (req, res) => {
    const { shift_name, start_time, end_time, crosses_midnight, grace_minutes } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    const isExist = await prisma.shift.findFirst({
        where: { shiftName: shift_name },
        select: { id: true },
    });
    if (isExist) {
        req.flash('error', 'Shift name already exist !!!');
        return res.redirect('back');
    }

    await prisma.shift.create({
        data: {
            shiftName: shift_name,
            startTime: timeStringToDate(start_time),
            endTime: timeStringToDate(end_time),
            crossesMidnight: crosses_midnight === 'on' || crosses_midnight === '1' ? 1 : 0,
            graceMinutes: parseInt(grace_minutes) || 10,
            createdBy: createdBy,
            updatedBy: updatedBy,
        }
    })

    req.flash('success', 'Successfully insert data');
    return res.redirect('back');
}

const updateShift = async (req, res) => {
    const { shift_name, start_time, end_time, crosses_midnight, grace_minutes } = req.body;
    const id = parseInt(req.body.shift_id);
    const updatedBy = req.user.fullName;

    const isExist = await prisma.shift.findFirst({
        where: { shiftName: shift_name, NOT: { id: id } },
        select: { id: true },
    });
    if (isExist) {
        req.flash('error', 'Shift name already exist !!!');
        return res.redirect('back');
    }

    await prisma.shift.update({
        where: { id: id },
        data: {
            shiftName: shift_name,
            startTime: timeStringToDate(start_time),
            endTime: timeStringToDate(end_time),
            crossesMidnight: crosses_midnight === 'on' || crosses_midnight === '1' ? 1 : 0,
            graceMinutes: parseInt(grace_minutes) || 10,
            updatedBy: updatedBy,
        }
    })

    req.flash('success', 'Successfully update data');
    return res.redirect('back');
}

const deleteShift = async (req, res) => {
    const shiftId = parseInt(req.body.shift_id);

    const isUsedByAssignment = await prisma.employeeShift.findFirst({
        where: { shiftId: shiftId },
        select: { id: true },
    })
    const isUsedByBusinessUnit = await prisma.businessUnit.findFirst({
        where: { defaultShiftId: shiftId },
        select: { id: true },
    })

    if (isUsedByAssignment || isUsedByBusinessUnit) {
        req.flash('errorDelete', 'Data already used (assignment or business unit default) !!');
        return res.redirect('back');
    }

    await prisma.shift.delete({
        where: { id: shiftId }
    })
    return res.redirect('back');
}

module.exports = {
    listShift,
    createShift,
    updateShift,
    deleteShift,
}
