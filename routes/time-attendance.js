var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();
const { createDataTimeAttendance, listingAllDataTimeAttendance, listingAllDataTimeAttendance2, timeAttendanceReportByAdmin, timeAttendanceReportByEmployee } = require('../controllers/time-attendance.controller');
var router = express.Router();

router.get('/time-attendance-admin', ensureLoggedIn, ah(listingAllDataTimeAttendance));
router.post('/time-attendance-admin', ensureLoggedIn, ah(createDataTimeAttendance));
router.get('/time-attendance-admin/report', ensureLoggedIn, ah(timeAttendanceReportByAdmin));

router.get('/time-attendance-employee', ensureLoggedIn, ah(listingAllDataTimeAttendance2));
router.get('/time-attendance-employee/report', ensureLoggedIn, ah(timeAttendanceReportByEmployee));

module.exports = router;