var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();
var router = express.Router();
const { showSetupEmployeeSalary, updateSetupEmployeeSalary, updateComponentSetupEmployeeSalary, editEmployeeSalary, insertComponentSetupEmployeeSalary } = require('../controllers/setup-employee-salary.controller');

router.get('/setup-employee-salary', ensureLoggedIn, ah(showSetupEmployeeSalary));
router.post('/setup-employee-salary/update', ensureLoggedIn, ah(updateSetupEmployeeSalary));
router.get('/setup-employee-salary/edit/(:uuid)', ensureLoggedIn, ah(editEmployeeSalary));
router.post('/setup-employee-salary/add-component', ensureLoggedIn, ah(insertComponentSetupEmployeeSalary));
router.post('/setup-employee-salary/update-component', ensureLoggedIn, ah(updateComponentSetupEmployeeSalary));

module.exports = router;

