var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listAdminManagement, assignAdmin, removeAdmin, searchAdminManagement, showPromoteEmployee, processPromoteEmployee } = require('../controllers/admin-management.controller');

router.get('/admin-management', ensureLoggedIn, ah(listAdminManagement));
router.get('/admin-management/search', ensureLoggedIn, ah(searchAdminManagement));
//router.get('/admin-management/add', ensureLoggedIn, ah(addAdminManagement));
router.post('/admin-management/assign', ensureLoggedIn, ah(assignAdmin));
router.post('/admin-management/remove', ensureLoggedIn, ah(removeAdmin));

module.exports = router;
