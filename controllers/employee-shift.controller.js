const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');
const moment = require('moment');

/** Halaman daftar penugasan shift karyawan + form assign. */
const listEmployeeShift = async (req, res) => {
    const query = req.query;
    let search = query.search;
    let where = { status: 'Active' };
    if (query.search) {
        where.fullName = { contains: search };
    }
    // Filter default: hanya karyawan di BU mode PRESENCE (pabrik).
    if (query.show_all !== '1') {
        where.businessUnit = Object.assign(
            { attendanceMode: 'PRESENCE' },
            where.businessUnit || {}
        );
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.users.count({ where });
    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if (totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataEmployee = await prisma.users.findMany({
        skip: skip,
        take: limit,
        where,
        orderBy: { id: 'asc' },
        select: {
            id: true,
            fullName: true,
            employeeId: true,
            businessUnit: { select: { id: true, businessUnitName: true, attendanceMode: true } },
            division: { select: { id: true, divisionName: true } },
            employeeShifts: {
                orderBy: { effectiveFrom: 'desc' },
                take: 1,
                select: { effectiveFrom: true, shift: { select: { id: true, shiftName: true } } },
            },
        },
    });

    const listOfShift = await prisma.shift.findMany({
        orderBy: { shiftName: 'asc' },
        select: { id: true, shiftName: true },
    });

    const listOfBUForBulk = await prisma.businessUnit.findMany({
        orderBy: { businessUnitName: 'asc' },
        select: { id: true, businessUnitName: true },
    });

    const metaData = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage };
    const listOfEmployeeShift = { meta: metaData, data: getDataEmployee };

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/employee-shift/index', {
        user: userInfo,
        getRoles,
        search,
        pageTitle: 'Employee Shift',
        listOfEmployeeShift,
        listOfShift,
        listOfBUForBulk,
        moment,
    });
}

/** Assign shift per satu karyawan (upsert riwayat effectiveFrom). */
const assignEmployeeShift = async (req, res) => {
    const employeeId = parseInt(req.body.employee_id);
    const shiftId = parseInt(req.body.shift_id);
    const effectiveFrom = req.body.effective_from || moment.utc().format('YYYY-MM-DD');
    const by = req.user.fullName;

    if (!employeeId || !shiftId) {
        req.flash('error', 'Employee and shift are required');
        return res.redirect('back');
    }

    // Hapus assignment lama pada tanggal efektif yang sama lalu buat yang baru.
    await prisma.employeeShift.deleteMany({
        where: { employeeId: employeeId, effectiveFrom: moment.utc(effectiveFrom).toDate() },
    });
    await prisma.employeeShift.create({
        data: {
            employeeId: employeeId,
            shiftId: shiftId,
            effectiveFrom: moment.utc(effectiveFrom).toDate(),
            createdBy: by,
            updatedBy: by,
        },
    });

    req.flash('success', 'Successfully assign shift');
    return res.redirect('back');
}

/** Bulk assign: satu shift untuk semua karyawan aktif dalam satu business unit. */
const assignBulkShift = async (req, res) => {
    const businessUnitId = parseInt(req.body.business_unit_id);
    const shiftId = parseInt(req.body.shift_id);
    const effectiveFrom = req.body.effective_from || moment.utc().format('YYYY-MM-DD');
    const by = req.user.fullName;

    if (!businessUnitId || !shiftId) {
        req.flash('error', 'Business unit and shift are required');
        return res.redirect('back');
    }

    const employees = await prisma.users.findMany({
        where: { status: 'Active', businessUnitId: businessUnitId },
        select: { id: true },
    });
    if (employees.length === 0) {
        req.flash('error', 'No active employees in this business unit');
        return res.redirect('back');
    }

    const effDate = moment.utc(effectiveFrom).toDate();
    for (const emp of employees) {
        await prisma.employeeShift.deleteMany({
            where: { employeeId: emp.id, effectiveFrom: effDate },
        });
        await prisma.employeeShift.create({
            data: {
                employeeId: emp.id,
                shiftId: shiftId,
                effectiveFrom: effDate,
                createdBy: by,
                updatedBy: by,
            },
        });
    }

    req.flash('success', 'Bulk assign done for ' + employees.length + ' employee(s)');
    return res.redirect('back');
}

module.exports = {
    listEmployeeShift,
    assignEmployeeShift,
    assignBulkShift,
}
