var express = require('express');
var ah = require('../helper/async-handler');
const { showIndex, showEditSalary, showEditSalaryDetail, updateSalaryDetails } = require('../controllers/edit-salary.controller');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

router.get('/list-cutoff-period', ensureLoggedIn, ah(showIndex));
router.get('/edit-salary/(:uuidCutoffPeriod)', ensureLoggedIn, ah(showEditSalary));
router.get('/edit-salary-details/(:uuidPayslipHeader)', ensureLoggedIn, ah(showEditSalaryDetail));
router.post('/edit-salary-details/update', ensureLoggedIn, ah(updateSalaryDetails));

module.exports = router;