var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { requestMedicalReimbursement, processRequestMedicalReimbursement, listOfMedicalReimbursement, showDetailRequestMedicalReimbursement, listingApproveMedicalReimbursementBySupervisor, approveMedicalReimbursementBySupervisor, processApproveMedicalReimbursementBySupervisor, listingApproveMedicalReimbursementByHR, approveMedicalReimbursementByHR, processApproveMedicalReimbursementByHR, listingApproveMedicalReimbursementByFinance, approveMedicalReimbursementByFinance, processApproveMedicalReimbursementByFinance, showMedicalReimbursementHistory, showRequestMedicalReimbursementHistory, getBalanceOfMedicalReibursementByCategoryId } = require('../controllers/medical-reimbursement.controller');

router.get('/medical-reimbursement-request', ensureLoggedIn, ah(listOfMedicalReimbursement));
router.get('/medical-reimbursement-request/add', ensureLoggedIn, ah(requestMedicalReimbursement));
router.post('/medical-reimbursement-request/add', ensureLoggedIn, ah(processRequestMedicalReimbursement));
router.get('/medical-reimbursement-request/(:uuid)', ensureLoggedIn, ah(showDetailRequestMedicalReimbursement));
router.get('/medical-reimbursement-approved-by-supervisor/listing', ensureLoggedIn, ah(listingApproveMedicalReimbursementBySupervisor));
router.get('/medical-reimbursement-approved-by-supervisor/(:uuid)', ensureLoggedIn, ah(approveMedicalReimbursementBySupervisor));
router.post('/medical-reimbursement-approved-by-supervisor', ensureLoggedIn, ah(processApproveMedicalReimbursementBySupervisor));
router.get('/medical-reimbursement-approved-by-hr/listing', ensureLoggedIn, ah(listingApproveMedicalReimbursementByHR));
router.get('/medical-reimbursement-approved-by-hr/(:uuid)', ensureLoggedIn, ah(approveMedicalReimbursementByHR));
router.post('/medical-reimbursement-approved-by-hr', ensureLoggedIn, ah(processApproveMedicalReimbursementByHR));
router.get('/medical-reimbursement-approved-by-fa/listing', ensureLoggedIn, ah(listingApproveMedicalReimbursementByFinance));
router.get('/medical-reimbursement-approved-by-fa/(:uuid)', ensureLoggedIn, ah(approveMedicalReimbursementByFinance));
router.post('/medical-reimbursement-approved-by-fa', ensureLoggedIn, ah(processApproveMedicalReimbursementByFinance));

router.get('/medical-reimbursement-history/(:uuid)', ensureLoggedIn, ah(showMedicalReimbursementHistory));
router.get('/medical-reimbursement-request/history/(:uuid)', ensureLoggedIn, ah(showRequestMedicalReimbursementHistory));

router.get('/medical-reimbursement-balance-by-category', ensureLoggedIn, ah(getBalanceOfMedicalReibursementByCategoryId));

module.exports = router;