var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listDivision, createDivision, updateDivision, deleteDivision } = require('../controllers/division.controller');

router.get('/division', ensureLoggedIn, ah(listDivision));
router.post('/division', ensureLoggedIn, ah(createDivision));
router.post('/division/update', ensureLoggedIn, ah(updateDivision));
router.post('/division/delete', ensureLoggedIn, ah(deleteDivision));

module.exports = router;
