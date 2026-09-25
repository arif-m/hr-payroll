var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listBusinessUnit, updateBusinessUnit } = require('../controllers/business-unit.controller');

router.get('/business-unit', ensureLoggedIn, ah(listBusinessUnit));
router.post('/business-unit/update', ensureLoggedIn, ah(updateBusinessUnit));

module.exports = router;
