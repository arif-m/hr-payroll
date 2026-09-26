const prisma = require('../libs/prisma');
const moment = require('moment');
const { listRolesPermission } = require('../helper/roles-permission');
const { runAnnualLeaveReset, RESET_MODES } = require('../libs/leave/annual-cycle');

/** Halaman Annual Leave Reset: kebijakan + form + hasil preview/execute terakhir. */
const showAnnualLeaveReset = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const setup = await prisma.setupAnnualLeave.findFirst();
    res.render('pages/leave-management/annual-leave-reset', {
        user: userInfo,
        getRoles,
        pageTitle: 'Annual Leave Reset',
        setup,
        resetModes: RESET_MODES,
        result: null,
        execute: false,
        moment,
    });
}

/** Simpan kebijakan reset (resetMode) — wajib dipilih sebelum siklus bisa jalan. */
const updateAnnualLeaveResetPolicy = async (req, res) => {
    const { reset_mode } = req.body;
    if (!RESET_MODES.includes(reset_mode)) {
        req.flash('error', 'Kebijakan reset tidak valid !!');
        return res.redirect('/annual-leave-reset');
    }
    const setup = await prisma.setupAnnualLeave.findFirst();
    if (!setup) {
        req.flash('error', 'Setup annual leave belum ada !!');
        return res.redirect('/annual-leave-reset');
    }
    await prisma.setupAnnualLeave.update({
        where: { id: setup.id },
        data: { resetMode: reset_mode, updatedBy: req.user.fullName },
    });
    req.flash('success', 'Kebijakan penghangusan annual leave tersimpan !!');
    res.redirect('/annual-leave-reset');
}

/** POST preview: hitung penghangusan tanpa mengubah data (dry-run). */
const previewAnnualLeaveReset = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const setup = await prisma.setupAnnualLeave.findFirst();
    let result = null;
    let execute = false;
    try {
        result = await runAnnualLeaveReset({ actor: req.user.fullName, execute: false });
    } catch (e) {
        req.flash('error', e.message);
    }
    res.render('pages/leave-management/annual-leave-reset', {
        user: userInfo,
        getRoles,
        pageTitle: 'Annual Leave Reset',
        setup,
        resetModes: RESET_MODES,
        result,
        execute,
        moment,
    });
}

/** POST execute: jalankan penghangusan dalam satu transaksi atomik. */
const executeAnnualLeaveReset = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const setup = await prisma.setupAnnualLeave.findFirst();
    let result = null;
    let execute = true;
    try {
        result = await runAnnualLeaveReset({ actor: req.user.fullName, execute: true });
        req.flash('success', 'Penghangusan annual leave berhasil: ' + (result.zeroed || 0) + ' karyawan.');
    } catch (e) {
        execute = false;
        req.flash('error', e.message);
    }
    res.render('pages/leave-management/annual-leave-reset', {
        user: userInfo,
        getRoles,
        pageTitle: 'Annual Leave Reset',
        setup,
        resetModes: RESET_MODES,
        result,
        execute,
        moment,
    });
}

module.exports = {
    showAnnualLeaveReset,
    updateAnnualLeaveResetPolicy,
    previewAnnualLeaveReset,
    executeAnnualLeaveReset,
};
