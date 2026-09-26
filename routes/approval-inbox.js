var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showApprovalInbox } = require('../controllers/approval-inbox.controller');

router.get('/approval-inbox', ensureLoggedIn, ah(showApprovalInbox));

module.exports = router;
