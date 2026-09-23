var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listOfSalaryComponent, createSalaryComponent, updateSalaryComponent, deleteSalaryComponent } = require('../controllers/salary-component.controller');

router.get('/salary-component', ensureLoggedIn, ah(listOfSalaryComponent));
router.post('/salary-component', ensureLoggedIn, ah(createSalaryComponent));
router.post('/salary-component/update', ensureLoggedIn, ah(updateSalaryComponent));
router.post('/salary-component/delete', ensureLoggedIn, ah(deleteSalaryComponent));

module.exports = router;

