var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { createBpjsTenagaKerjaComponent, deleteBpjsTenagaKerjaComponent, updateBpjsTenagaKerjaComponent, showBpjsTenagaKerjaComponent } = require('../controllers/bpjs-tenaga-kerja-component.controller');

router.get('/bpjs-tenaga-kerja-component', ensureLoggedIn, ah(showBpjsTenagaKerjaComponent));
router.post('/bpjs-tenaga-kerja-component', ensureLoggedIn, ah(createBpjsTenagaKerjaComponent));
router.post('/bpjs-tenaga-kerja-component/update', ensureLoggedIn, ah(updateBpjsTenagaKerjaComponent));
router.post('/bpjs-tenaga-kerja-component/delete', ensureLoggedIn, ah(deleteBpjsTenagaKerjaComponent));

module.exports = router;

