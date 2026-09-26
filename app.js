"use strict";

// Serialisasi BigInt ke JSON untuk kolom employeeId dsb
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const cron = require('node-cron');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const csrf = require('./libs/csrf'); // pengganti csurf (deprecated) — API sama: req.csrfToken()
const passport = require('passport');
const logger = require('morgan');
//var rfs = require('rotating-file-stream') 
const flash = require('connect-flash');
const winston = require('./libs/logger');

// pass the session to the connect sqlite3 module
// allowing it to inherit from session.Store
var SQLiteStore = require('connect-sqlite3')(session);

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');var divisionRouter = require('./routes/division');var shiftRouter = require('./routes/shift');var businessUnitRouter = require('./routes/business-unit');var employeeShiftRouter = require('./routes/employee-shift');var attendanceSetupRouter = require('./routes/attendance-setup');
var approvalInboxRouter = require('./routes/approval-inbox');
var jobtitlesRouter = require('./routes/jobtitles');
var employeeRouter = require('./routes/employee');
var adminManagementRouter = require('./routes/admin-management');
var fileUpload = require("express-fileupload");
var rateLimit = require("express-rate-limit");

const leaveManagementRouter = require('./routes/leave-management');
const rolesRouter = require('./routes/roles');
const rolesPermissionRouter = require('./routes/roles-permission');
const ptkpRouter = require('./routes/ptkp');
const calendarRouter = require('./routes/calendar');
const salaryComponent = require('./routes/salary-component');
const salaryTemplate = require('./routes/salary-template');
const setupEmployeeSalary = require('./routes/setup-employee-salary');
const bpjsTenagaKerjaComponent = require('./routes/bpjs-tenaga-kerja-component');
const bpjsTenagaKerjaTemplate = require('./routes/bpjs-tenaga-kerja-template');
const generateSalary = require('./routes/generate-salary');
const editSalary = require('./routes/edit-salary');
const payslip = require('./routes/payslip');
const otherLeaveType = require('./routes/other-leave-type');
const medicalReimbursementCategory = require('./routes/medical-reimbursement-category');
const requestMedicalReimbursement = require('./routes/medical-reimbursement');
const timeAttendance = require('./routes/time-attendance');
const timeClocking = require('./routes/time-clocking');
const requestOvertime = require('./routes/overtime');
const pkpRoutes = require('./routes/pkp');
const terRateRoutes = require('./routes/ter-rate');
const payrollRunRoutes = require('./routes/payroll-run');
const employmentHistoryRoutes = require('./routes/employment-history');
const annualLeaveResetRouter = require('./routes/annual-leave-reset');

const { calculateAnnualLeave, calculateSickLeave } = require('./helper/calculate-leave');
const { resetMedicalReimbursement } = require('./helper/reset-medical-reimbursement');

var app = express();

// create a rotating write stream
/*
var accessLogStream = rfs.createStream('access.log', {
  interval: '1d', // rotate daily
  path: path.join(__dirname, 'log')
}) */


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.locals.pluralize = require('pluralize');

app.use(fileUpload());
// setup the logger
//app.use(logger('combined', { stream: accessLogStream }))
app.use(logger('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  cookie: { httpOnly: true, sameSite: 'lax' },
  store: new SQLiteStore({ db: 'sessions.db', dir: 'var/db' })
}));
app.use(csrf());
app.use(passport.authenticate('session'));
app.use(flash()); //USE FLASH MESSAGES

app.use(function(req, res, next) {
  var msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !! msgs.length;
  req.session.messages = [];
  
  res.locals.message = req.flash();
  next();
});
app.use(function(req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use(limiter);

app.use('/', indexRouter);
app.use('/', authRouter);app.use('/', divisionRouter);app.use('/', shiftRouter);app.use('/', businessUnitRouter);app.use('/', employeeShiftRouter);app.use('/', attendanceSetupRouter);
app.use('/', approvalInboxRouter);
app.use('/', jobtitlesRouter);
app.use('/', employeeRouter);
app.use('/', adminManagementRouter);
app.use('/', leaveManagementRouter);
app.use('/', rolesRouter);
app.use('/', rolesPermissionRouter);
app.use('/', ptkpRouter);
app.use('/', calendarRouter);
app.use('/', salaryComponent);
app.use('/', salaryTemplate);
app.use('/', setupEmployeeSalary)
app.use('/', bpjsTenagaKerjaComponent);
app.use('/', bpjsTenagaKerjaTemplate);
app.use('/', generateSalary);
app.use('/', editSalary);
app.use('/', payslip);
app.use('/', otherLeaveType);
app.use('/', medicalReimbursementCategory);
app.use('/', requestMedicalReimbursement);
app.use('/', timeAttendance);
app.use('/', timeClocking);
app.use('/', requestOvertime);
app.use('/', pkpRoutes);
app.use('/', terRateRoutes);
app.use('/', payrollRunRoutes);
app.use('/', employmentHistoryRoutes);
app.use('/', annualLeaveResetRouter);

// catch 404 and forward to error handler
/*
app.use(function(req, res, next) {
  next(createError(404));
});
*/

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// running at 00:00 on the 1st day of every month (schedule: menit jam tanggal bulan weekday)
cron.schedule("0 0 1 * *", function() {
  calculateAnnualLeave();
  calculateSickLeave();
  winston.info("Calculate annual and sick leave successfully");
});

//running at the beginning of year - Jan, 1st
cron.schedule("0 0 1 1 *", function() {
  resetMedicalReimbursement();
  winston.info("Reset medical reimbursement successfully");
});

// Derivasi kehadiran harian untuk BU mode PRESENCE (pabrik): 01:00 setiap hari
const { runDailyDerivation } = require('./libs/attendance/derive');
cron.schedule("0 1 * * *", function() {
  runDailyDerivation().catch(function(err) {
    winston.error("Daily attendance derivation failed: " + err.message);
  });
});

//calculate every 10 seconds
// cron.schedule("*/10 * * * * *", function() {
//   resetMedicalReimbursement();
//   calculateAnnualLeave();
//   calculateSickLeave();
//   logger.debug("Calculate annual and sick leave successfully every 10 second", "success");
//   console.log('calculate annual leave & sick leave running every 10 second');
// });

module.exports = app;
