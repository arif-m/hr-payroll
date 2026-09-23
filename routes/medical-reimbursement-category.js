var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showIndex, createDataMedicalReimbursementCategory, updateDataMedicalReimbursementCategory, deleteDataMedicalReimbursementCategory } = require('../controllers/medical-reimbursement-category.controller');

router.get('/medical-reimbursement-category', ensureLoggedIn, ah(showIndex));
router.post('/medical-reimbursement-category', ensureLoggedIn, ah(createDataMedicalReimbursementCategory));
router.post('/medical-reimbursement-category/update', ensureLoggedIn, ah(updateDataMedicalReimbursementCategory));
router.post('/medical-reimbursement-category/delete', ensureLoggedIn, ah(deleteDataMedicalReimbursementCategory));

//router.get('/other-leave-by-uuid/(:uuid)', ensureLoggedIn, ah(getOtherLeaveByUuid));

module.exports = router;
