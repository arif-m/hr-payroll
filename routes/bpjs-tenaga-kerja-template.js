var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showBpjsTenagaKerjaTemplate, insertBpjsTenagaKerjaTemplateHeader, updateBpjsTenagaKerjaTemplateHeader, deleteOfBpjsTenagaKerjaTemplateDetails, showAddBpjsTenagaKerjaComponents, insertBpjsTenagaKerjaComponents } = require('../controllers/bpjs-tenaga-kerja-template.controller');

router.get('/bpjs-tenaga-kerja-template', ensureLoggedIn, ah(showBpjsTenagaKerjaTemplate));
router.post('/bpjs-tenaga-kerja-template', ensureLoggedIn, ah(insertBpjsTenagaKerjaTemplateHeader));
router.post('/bpjs-tenaga-kerja-template/update', ensureLoggedIn, ah(updateBpjsTenagaKerjaTemplateHeader));
router.get('/bpjs-tenaga-kerja-template/add-component/(:uuid)', ensureLoggedIn, ah(showAddBpjsTenagaKerjaComponents));
router.post('/bpjs-tenaga-kerja-template/insert-component', ensureLoggedIn, ah(insertBpjsTenagaKerjaComponents));
router.post('/bpjs-tenaga-kerja-template/delete-component', ensureLoggedIn, ah(deleteOfBpjsTenagaKerjaTemplateDetails));

module.exports = router;

