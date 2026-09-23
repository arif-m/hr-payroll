var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showIndex, createDataGenerateSalary, updateDataGenerateSalary, showGenerate, processGenerateSalaryByEmployee, processGenerateSalaryAllEmployee } = require('../controllers/generate-salary.controller');

router.get('/generate-salary', ensureLoggedIn, ah(showIndex));
router.post('/generate-salary', ensureLoggedIn, ah(createDataGenerateSalary));
router.post('/generate-salary/update', ensureLoggedIn, ah(updateDataGenerateSalary));
router.get('/generate-salary/generate/(:uuid)', ensureLoggedIn, ah(showGenerate));
router.get('/generate-salary/process/:cutoffPeriodId/(:employeeUuid)', ensureLoggedIn, ah(processGenerateSalaryByEmployee));
router.post('/generate-salary/process', ensureLoggedIn, ah(processGenerateSalaryByEmployee));
router.post('/generate-salary/process/all-employee', ensureLoggedIn, ah(processGenerateSalaryAllEmployee))

module.exports = router;