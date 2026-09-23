var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listJobtitles, createJobtitles, updateJobtitles, deleteJobtitles } = require('../controllers/jobtitles.controller');

router.get('/jobtitles', ensureLoggedIn, ah(listJobtitles));
router.post('/jobtitles', ensureLoggedIn, ah(createJobtitles));
router.post('/jobtitles/update', ensureLoggedIn, ah(updateJobtitles));
router.post('/jobtitles/delete', ensureLoggedIn, ah(deleteJobtitles));

module.exports = router;
