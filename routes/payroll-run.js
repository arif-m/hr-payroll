var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showIndex, showDetail, createRun, doTransition, downloadPaymentFile, downloadSptMasa, sendPayslipsEmail, markRunPayment, markDetailPayment, addTranchePayment, cancelTranchePayment } = require('../controllers/payroll-run.controller');

router.get('/payroll-run', ensureLoggedIn, ah(showIndex));
router.get('/payroll-run/:id', ensureLoggedIn, ah(showDetail));
router.post('/payroll-run/create', ensureLoggedIn, ah(createRun));
router.post('/payroll-run/transition', ensureLoggedIn, ah(doTransition));
router.get('/payroll-run/:id/payment-file', ensureLoggedIn, ah(downloadPaymentFile));
router.get('/payroll-run/:id/spt-masa', ensureLoggedIn, ah(downloadSptMasa));
router.post('/payroll-run/:id/send-payslips', ensureLoggedIn, ah(sendPayslipsEmail));
router.post('/payroll-run/:id/payment', ensureLoggedIn, ah(markRunPayment));
router.post('/payroll-run/:id/payment/detail', ensureLoggedIn, ah(markDetailPayment));
router.post('/payroll-run/:id/payment/tranche', ensureLoggedIn, ah(addTranchePayment));
router.post('/payroll-run/:id/payment/tranche/cancel', ensureLoggedIn, ah(cancelTranchePayment));

module.exports = router;
