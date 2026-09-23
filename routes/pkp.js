var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listingAllPkp, createDataPkp, updateDataPkp, deleteDataPkp } = require('../controllers/pkp.controller');

router.get('/pkp', ensureLoggedIn, ah(listingAllPkp));
router.post('/pkp', ensureLoggedIn, ah(createDataPkp));
router.post('/pkp/update', ensureLoggedIn, ah(updateDataPkp));
router.post('/pkp/delete', ensureLoggedIn, ah(deleteDataPkp));

module.exports = router;