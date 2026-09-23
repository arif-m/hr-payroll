var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listEmployee, createEmployee, updateEmployee, deleteEmployee, getEmployeeDetail, setInactiveEmployee, showPromoteEmployee, processPromoteEmployee, myAnnualLeave, mySickLeave, requestAnnualLeave, processRequestAnnualLeave, requestSickLeave, processRequestSickLeave, getDataOfCalendarAndWorkdays, requestSickLeave2, processRequestSickLeave2, showTotalDayOfCalendar, requestUnpaidLeave, processRequestUnpaidLeave, myProfileEmployee, updateProfileImage, showDataEmployeeJson, showDataEmployeeJsonbyStatus, showSetupAnnualLeaveEmployee, processSetupAnnualLeaveEmployee } = require('../controllers/employee.controller');
const { requestOtherLeave, getLimitDayOfOtherLeaveType, processRequestOtherLeave } = require('../controllers/other-leave-management.controller');

router.get('/employee-by-employement-status-json', ensureLoggedIn, ah(showDataEmployeeJsonbyStatus));
router.get('/employee-json', ensureLoggedIn, ah(showDataEmployeeJson));

router.get('/employee', ensureLoggedIn, ah(listEmployee));
router.post('/employee', ensureLoggedIn, ah(createEmployee));
router.post('/employee/update', ensureLoggedIn, ah(updateEmployee));
router.post('/employee/delete', ensureLoggedIn, ah(deleteEmployee));
router.get('/employee/(:uuid)', ensureLoggedIn, ah(getEmployeeDetail));
router.post('/employee/set-inactive', ensureLoggedIn, ah(setInactiveEmployee));
router.get('/my-profile', ensureLoggedIn, ah(myProfileEmployee));
router.post('/my-profile/update', ensureLoggedIn, ah(updateProfileImage));

router.get('/promote-employee', ensureLoggedIn, ah(showPromoteEmployee));
router.post('/employee/promote-employee', ensureLoggedIn, ah(processPromoteEmployee));

router.get('/setup-annual-leave', ensureLoggedIn, ah(showSetupAnnualLeaveEmployee));
router.post('/employee/setup-annual-leave', ensureLoggedIn, ah(processSetupAnnualLeaveEmployee));

router.get('/my-annual-leave', ensureLoggedIn, ah(myAnnualLeave));
router.get('/my-sick-leave', ensureLoggedIn, ah(mySickLeave));
router.get('/request-annual-leave', ensureLoggedIn, ah(requestAnnualLeave));
router.post('/employee/request-annual-leave', ensureLoggedIn, ah(processRequestAnnualLeave));
router.get('/request-sick-leave', ensureLoggedIn, ah(requestSickLeave));
router.post('/employee/request-sick-leave', ensureLoggedIn, ah(processRequestSickLeave));
router.get('/request-other-leave', ensureLoggedIn, ah(requestOtherLeave));
router.post('/employee/request-other-leave', ensureLoggedIn, ah(processRequestOtherLeave));
router.get('/request-unpaid-leave', ensureLoggedIn, ah(requestUnpaidLeave));
router.post('/employee/request-unpaid-leave', ensureLoggedIn, ah(processRequestUnpaidLeave));

router.get('/get-data-calendar/:startDate/:days', ensureLoggedIn, ah(showTotalDayOfCalendar));
router.get('/get-data-calendar-workdays/:startDate/:days', ensureLoggedIn, ah(getDataOfCalendarAndWorkdays));
router.get('/get-data-limit-other-leave/(:id)', ensureLoggedIn, ah(getLimitDayOfOtherLeaveType));

router.get('/request-sick-leave2', ensureLoggedIn, ah(requestSickLeave2));
router.post('/employee/request-sick-leave2', ensureLoggedIn, ah(processRequestSickLeave2));

module.exports = router;
