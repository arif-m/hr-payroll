var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listShift, createShift, updateShift, deleteShift } = require('../controllers/shift.controller');

router.get('/shift', ensureLoggedIn, ah(listShift));
router.post('/shift', ensureLoggedIn, ah(createShift));
router.post('/shift/update', ensureLoggedIn, ah(updateShift));
router.post('/shift/delete', ensureLoggedIn, ah(deleteShift));

module.exports = router;
