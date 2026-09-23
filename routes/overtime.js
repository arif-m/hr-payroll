var express = require('express');
var ah = require('../helper/async-handler');
const { listOfOvertime, addRequestOvertime, storeDataOvertime, detailsOfOvertime, processApproveRequestOvertimeByHR, approveRequestOvertimeByHead, processApproveRequestOvertimeByHead, approveRequestOvertimeByHeadDetails, approveRequestOvertimeByHR, approveRequestOvertimeByHRDetails } = require('../controllers/overtime-controller');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

router.get('/request-overtime', ensureLoggedIn, ah(listOfOvertime));
router.get('/request-overtime/add', ensureLoggedIn, ah(addRequestOvertime));
router.post('/request-overtime/store', ensureLoggedIn, ah(storeDataOvertime));
router.get('/request-overtime/show/(:uuid)', ensureLoggedIn, ah(detailsOfOvertime));

router.get('/approve-request-overtime-by-head/listing', ensureLoggedIn, ah(approveRequestOvertimeByHead));
router.get('/approve-request-overtime-by-head/(:uuid)', ensureLoggedIn, ah(approveRequestOvertimeByHeadDetails));
router.post('/approve-request-overtime-by-head/update', ensureLoggedIn, ah(processApproveRequestOvertimeByHead));

router.get('/approve-request-overtime-by-hr/listing', ensureLoggedIn, ah(approveRequestOvertimeByHR));
router.get('/approve-request-overtime-by-hr/(:uuid)', ensureLoggedIn, ah(approveRequestOvertimeByHRDetails))
router.post('/approve-request-overtime-by-hr/update', ensureLoggedIn, ah(processApproveRequestOvertimeByHR));

module.exports = router;