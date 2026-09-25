var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listEmployeeShift, assignEmployeeShift, assignBulkShift } = require('../controllers/employee-shift.controller');

router.get('/employee-shift', ensureLoggedIn, ah(listEmployeeShift));
router.post('/employee-shift/assign', ensureLoggedIn, ah(assignEmployeeShift));
router.post('/employee-shift/assign-bulk', ensureLoggedIn, ah(assignBulkShift));

module.exports = router;
