var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listingAllPtkp, createDataPtkp, updateDataPtkp, deleteDataPtkp } = require('../controllers/ptkp.controller');

router.get('/ptkp', ensureLoggedIn, ah(listingAllPtkp));
router.post('/ptkp', ensureLoggedIn, ah(createDataPtkp));
router.post('/ptkp/update', ensureLoggedIn, ah(updateDataPtkp));
router.post('/ptkp/delete', ensureLoggedIn, ah(deleteDataPtkp));

module.exports = router;