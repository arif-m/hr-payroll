var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { showSalaryTemplate, insertSalaryTemplateHeader, deleteOfSalaryTemplateDetails, insertComponents, showAddComponents, updateSalaryTemplateHeader, showSynchronizeComponent, processSynchronizeComponent } = require('../controllers/salary-template.controller');
const { validateSalaryTemplateInsert, validateSalaryTemplateUpdate } = require('../validation/salary-template');

router.get('/salary-template', ensureLoggedIn, ah(showSalaryTemplate));
router.post('/salary-template', ensureLoggedIn, validateSalaryTemplateInsert, ah(insertSalaryTemplateHeader));
router.post('/salary-template/update', ensureLoggedIn, validateSalaryTemplateUpdate, ah(updateSalaryTemplateHeader));
router.get('/salary-template/add-component/(:uuid)', ensureLoggedIn, ah(showAddComponents));
router.post('/salary-template/insert-component', ensureLoggedIn, ah(insertComponents));
router.post('/salary-template/delete-component', ensureLoggedIn, ah(deleteOfSalaryTemplateDetails));
router.get('/salary-template/synchronize-component/(:uuid)', ensureLoggedIn, ah(showSynchronizeComponent));
router.post('/salary-template/synchronize-component', ensureLoggedIn, ah(processSynchronizeComponent));

module.exports = router;

