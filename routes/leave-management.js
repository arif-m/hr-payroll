var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showConfigureAnnualLeave, updateConfigureAnnualLeave, showConfigureSickLeave, updateConfigureSickLeave, getRequestLeaveByUuid, calculateAnnualLeave, calculateSickLeave, approvedRequestAnnualLeaveBySupervisor, processApprovedRequestAnnualLeaveBySupervisor, approvedRequestAnnualLeaveByHR, processApprovedRequestAnnualLeaveByHR, approvedRequestSickLeaveBySupervisor, processApprovedRequestSickLeaveBySupervisor, approvedRequestSickLeaveByHR, processApprovedRequestSickLeaveByHR, approvedRequestSickLeave2BySupervisor, processApprovedRequestSickLeave2BySupervisor, processApprovedRequestSickLeave2ByHR, approvedRequestSickLeave2ByHR, approvedRequestUnpaidLeaveBySupervisor, processApprovedRequestUnpaidLeaveBySupervisor, approvedRequestUnpaidLeaveByHR, processApprovedRequestUnpaidLeaveByHR } = require('../controllers/leave-management.controller');
const { approvedRequestOtherLeaveBySupervisor, processApprovedRequestOtherLeaveBySupervisor, approvedRequestOtherLeaveByHR, processApprovedRequestOtherLeaveByHR } = require('../controllers/other-leave-management.controller');

router.get('/leave-management/configure-annual-leave', ensureLoggedIn, ah(showConfigureAnnualLeave));
router.post('/leave-management/configure-annual-leave', ensureLoggedIn, ah(updateConfigureAnnualLeave));

router.get('/leave-management/configure-sick-leave', ensureLoggedIn, ah(showConfigureSickLeave))
router.post('/leave-management/configure-sick-leave', ensureLoggedIn, ah(updateConfigureSickLeave))

router.get('/approve-annual-leave-by-supervisor', ensureLoggedIn, ah(approvedRequestAnnualLeaveBySupervisor));
router.post('/leave-management/approve-annual-leave-by-supervisor', ensureLoggedIn, ah(processApprovedRequestAnnualLeaveBySupervisor));
router.get('/annual-leave-by-uuid/(:uuid)', ensureLoggedIn, ah(getRequestLeaveByUuid));

router.get('/approve-annual-leave-by-hr', ensureLoggedIn, ah(approvedRequestAnnualLeaveByHR));
router.post('/leave-management/approve-annual-leave-by-hr', ensureLoggedIn, ah(processApprovedRequestAnnualLeaveByHR));

router.get('/approve-sick-leave-by-supervisor', ensureLoggedIn, ah(approvedRequestSickLeaveBySupervisor));
router.post('/leave-management/approve-sick-leave-by-supervisor', ensureLoggedIn, ah(processApprovedRequestSickLeaveBySupervisor));
router.get('/sick-leave-by-uuid/(:uuid)', ensureLoggedIn, ah(getRequestLeaveByUuid));

router.get('/approve-sick-leave-by-hr', ensureLoggedIn, ah(approvedRequestSickLeaveByHR));
router.post('/leave-management/approve-sick-leave-by-hr', ensureLoggedIn, ah(processApprovedRequestSickLeaveByHR));

router.get('/approve-sick-leave2-by-supervisor', ensureLoggedIn, ah(approvedRequestSickLeave2BySupervisor));
router.post('/leave-management/approve-sick-leave2-by-supervisor', ensureLoggedIn, ah(processApprovedRequestSickLeave2BySupervisor));

router.get('/approve-sick-leave2-by-hr', ensureLoggedIn, ah(approvedRequestSickLeave2ByHR));
router.post('/leave-management/approve-sick-leave2-by-hr', ensureLoggedIn, ah(processApprovedRequestSickLeave2ByHR));

router.get('/approve-other-leave-by-supervisor', ensureLoggedIn, ah(approvedRequestOtherLeaveBySupervisor));
router.post('/leave-management/approve-other-leave-by-supervisor', ensureLoggedIn, ah(processApprovedRequestOtherLeaveBySupervisor));

router.get('/approve-other-leave-by-hr', ensureLoggedIn, ah(approvedRequestOtherLeaveByHR));
router.post('/leave-management/approve-other-leave-by-hr', ensureLoggedIn, ah(processApprovedRequestOtherLeaveByHR));

router.get('/leave-management/calculate-annual-leave', ensureLoggedIn, ah(calculateAnnualLeave));
router.get('/leave-management/calculate-sick-leave', ensureLoggedIn, ah(calculateSickLeave));

router.get('/approve-unpaid-leave-by-supervisor', ensureLoggedIn, ah(approvedRequestUnpaidLeaveBySupervisor));
router.post('/leave-management/approve-unpaid-leave-by-supervisor', ensureLoggedIn, ah(processApprovedRequestUnpaidLeaveBySupervisor));
router.get('/unpaid-leave-by-uuid/(:uuid)', ensureLoggedIn, ah(getRequestLeaveByUuid));

router.get('/approve-unpaid-leave-by-hr', ensureLoggedIn, ah(approvedRequestUnpaidLeaveByHR));
router.post('/leave-management/approve-unpaid-leave-by-hr', ensureLoggedIn, ah(processApprovedRequestUnpaidLeaveByHR));

module.exports = router