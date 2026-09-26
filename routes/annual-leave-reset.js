var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const {
  showAnnualLeaveReset,
  updateAnnualLeaveResetPolicy,
  previewAnnualLeaveReset,
  executeAnnualLeaveReset,
} = require('../controllers/annual-leave-reset.controller');

router.get('/annual-leave-reset', ensureLoggedIn, ah(showAnnualLeaveReset));
router.post('/annual-leave-reset/policy', ensureLoggedIn, ah(updateAnnualLeaveResetPolicy));
router.post('/annual-leave-reset/preview', ensureLoggedIn, ah(previewAnnualLeaveReset));
router.post('/annual-leave-reset/execute', ensureLoggedIn, ah(executeAnnualLeaveReset));

module.exports = router;
