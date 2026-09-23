var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listingEmployeeWithHistory, showEmploymentHistoryDetail } = require('../controllers/employment-history.controller');

router.get('/employment-history', ensureLoggedIn, ah(listingEmployeeWithHistory));
router.get('/employment-history/:uuid', ensureLoggedIn, ah(showEmploymentHistoryDetail));

module.exports = router;
