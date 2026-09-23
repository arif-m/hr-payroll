var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showRolesPermission, listingRolesPermission, editRolesPermission, updateRolesPermission } = require('../controllers/roles-permission.controller');

router.get('/roles-permission/list/(:rolesUuid)', ensureLoggedIn, ah(listingRolesPermission))
router.get('/roles-permission', ensureLoggedIn, ah(showRolesPermission));
router.get('/roles-permission/edit/(:rolesId)', ensureLoggedIn, ah(editRolesPermission));
router.post('/roles-permission/update', ensureLoggedIn, ah(updateRolesPermission));

module.exports = router

