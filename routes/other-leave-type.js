var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showIndex, createDataOtherLeaveType, updateDataOtherLeaveType, deleteDataOtherLeaveType } = require('../controllers/other-leave-type.controller');
const { getOtherLeaveByUuid } = require('../controllers/other-leave-management.controller');

router.get('/other-leave-type', ensureLoggedIn, ah(showIndex));
router.post('/other-leave-type', ensureLoggedIn, ah(createDataOtherLeaveType));
router.post('/other-leave-type/update', ensureLoggedIn, ah(updateDataOtherLeaveType));
router.post('/other-leave-type/delete', ensureLoggedIn, ah(deleteDataOtherLeaveType));

router.get('/other-leave-by-uuid/(:uuid)', ensureLoggedIn, ah(getOtherLeaveByUuid));

module.exports = router;
