var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listRoles, createRoles, updateRoles, deleteRoles } = require('../controllers/roles.controller');

router.get('/roles', ensureLoggedIn, ah(listRoles));
router.post('/roles', ensureLoggedIn, ah(createRoles));
router.post('/roles/update', ensureLoggedIn, ah(updateRoles));
router.post('/roles/delete', ensureLoggedIn, ah(deleteRoles));

module.exports = router;
