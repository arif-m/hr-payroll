var express = require('express');
var ah = require('../helper/async-handler');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
var ensureLoggedIn = ensureLogIn();

var router = express.Router();

const { listOfCalendar, createCalendar, updateCalendar, deleteCalendar, myCalendar, showHolidaysCalendar } = require('../controllers/calendar.controller');
//const { listOfHolidaysCalendar } = require('../helper/calendar');

router.get('/calendar', ensureLoggedIn, ah(listOfCalendar));
router.post('/calendar', ensureLoggedIn, ah(createCalendar));
router.post('/calendar/update', ensureLoggedIn, ah(updateCalendar));
router.post('/calendar/delete', ensureLoggedIn, ah(deleteCalendar));

router.get('/my-calendar', ensureLoggedIn, ah(myCalendar));
router.get('/holiday-calendar-json', ensureLoggedIn, ah(showHolidaysCalendar))
 
module.exports = router;