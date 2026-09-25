const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');

const listBusinessUnit = async (req, res) => {
    const listOfBU = await prisma.businessUnit.findMany({
        orderBy: { id: 'asc' },
        include: { defaultShift: { select: { id: true, shiftName: true } } },
    });
    const listOfShift = await prisma.shift.findMany({
        orderBy: { shiftName: 'asc' },
        select: { id: true, shiftName: true },
    });

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/business-unit/index', {
        user: userInfo,
        getRoles,
        pageTitle: 'Business Unit',
        listOfBU,
        listOfShift,
    });
}

const updateBusinessUnit = async (req, res) => {
    const id = parseInt(req.body.business_unit_id);
    const attendanceMode = req.body.attendance_mode === 'PRESENCE' ? 'PRESENCE' : 'EXCEPTION';
    const defaultShiftId = req.body.default_shift_id ? parseInt(req.body.default_shift_id) : null;
    const updatedBy = req.user.fullName;

    await prisma.businessUnit.update({
        where: { id: id },
        data: {
            attendanceMode: attendanceMode,
            defaultShiftId: defaultShiftId,
            updatedBy: updatedBy,
        },
    });

    req.flash('success', 'Successfully update business unit');
    return res.redirect('back');
}

module.exports = {
    listBusinessUnit,
    updateBusinessUnit,
}
