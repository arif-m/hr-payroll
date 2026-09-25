var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showAttendanceSetup, updateAttendanceSetup } = require('../controllers/attendance-setup.controller');

router.get('/attendance-setup', ensureLoggedIn, ah(showAttendanceSetup));
router.post('/attendance-setup/update', ensureLoggedIn, ah(updateAttendanceSetup));

module.exports = router;
