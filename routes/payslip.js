var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showIndex, generatePayslip, showIndexPayslipAdmin, showListOfEmployee, payslipAdminReport, replayPayslipAction } = require('../controllers/payslip.controller');

router.get('/payslip', ensureLoggedIn, ah(showIndex));
router.get('/payslip/generate/(:uuid)', ensureLoggedIn, ah(generatePayslip));
router.get('/payslip-admin', ensureLoggedIn, ah(showIndexPayslipAdmin));
router.get('/payslip-admin/(:uuid)', ensureLoggedIn, ah(showListOfEmployee));
router.get('/payslip-admin/report/(:uuid)', ensureLoggedIn, ah(payslipAdminReport));
router.post('/payslip/replay', ensureLoggedIn, ah(replayPayslipAction));

module.exports = router;