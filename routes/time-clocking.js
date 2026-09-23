var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();
var router = express.Router();
const { showTimeClocking, processCheckIn, processCheckOut } = require('../controllers/time-clocking.controller');

router.get('/time-clocking', ah(showTimeClocking));
router.post('/time-clocking/checkin', ah(processCheckIn));
router.post('/time-clocking/checkout', ah(processCheckOut));

module.exports = router;