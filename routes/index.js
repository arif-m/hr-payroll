
var express = require('express');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var db = require('../config/db');
const { changePassword, processChangePassword } = require('../controllers/users.controller');
const { getHome, getForgotPassword, postForgotPassword, getResetPassword, postResetPassword } = require('../controllers/home.controller');
const ah = require('../helper/async-handler');
const { sendEmail } = require('../helper/send-email');

var ensureLoggedIn = ensureLogIn();
var router = express.Router();

router.get('/', ah(getHome));
router.get('/forgot-password', ah(getForgotPassword));
router.post('/forgot-password', ah(postForgotPassword));
router.get('/reset-password/(:token)', ah(getResetPassword));
router.post('/reset-password', ah(postResetPassword));

router.get('/dashboard', ensureLoggedIn, ah(getHome));
router.get('/user/change-password', ensureLoggedIn, ah(changePassword));
router.post('/user/change-password', ensureLoggedIn, ah(processChangePassword));

module.exports = router;
