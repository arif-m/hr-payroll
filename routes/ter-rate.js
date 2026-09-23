var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listingAllTerRate, createDataTerRate, updateDataTerRate, deleteDataTerRate, resetDataTerRate } = require('../controllers/ter-rate.controller');

router.get('/ter-rate', ensureLoggedIn, ah(listingAllTerRate));
router.post('/ter-rate', ensureLoggedIn, ah(createDataTerRate));
router.post('/ter-rate/update', ensureLoggedIn, ah(updateDataTerRate));
router.post('/ter-rate/delete', ensureLoggedIn, ah(deleteDataTerRate));
router.post('/ter-rate/reset', ensureLoggedIn, ah(resetDataTerRate));

module.exports = router;
