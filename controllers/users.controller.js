var logger = require('../libs/logger'),
    csrf = require('../libs/csrf'),
    csrfProtection = csrf({
      cookie: true
    }),
    uuid = require('uuid');

const { v4: uuidv4 } = require('uuid');
var crypto = require('crypto');
var bcrypt = require('bcrypt');

const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');


const createUser = async (req, res) => {
  const { fullname, mobile_phone, email, password } = req.body

  const salt = bcrypt.genSaltSync(10);//or your salt constant
  const hashPassword = bcrypt.hashSync(password, salt);
  const moment = require('moment');

  let role = 1; //req.body.role;
  let joinDate = moment().toDate();
  let dob = moment().toDate();
  let placeOfBirth = 'Depok';
  let employeeId = 12121212;
  let personalIdType = 'SIM';
  let personalIdNumber = '0019191';
  let address = 'depok';
  let employmentStatus ='Probation';
  let businessUnitId = 1;
  let divisionId = 1;
  let jobTitleId = 1;
  let basicSalary = 1000000;
  let npwp = '029299999';
  
  const insertUser = await prisma.users.create({
    data: {
      employeeId: employeeId,
      roleId: role,
      fullName: fullname,
      joinDate: joinDate,
      email,
      mobilePhone: mobile_phone,
      dob: dob,
      placeOfBirth: placeOfBirth,
      personalIdType: personalIdType,
      personalIdNumber: personalIdNumber,
      address: address,
      employmentStatus: employmentStatus,
      businessUnitId: businessUnitId,
      divisionId: divisionId,
      jobTitleId: jobTitleId,
      basicSalary: basicSalary,
      npwp: npwp,
      password: hashPassword,
      salt: salt,
      createdBy: 'Admin',
      updatedBy: 'Admin'
    },

  })

  res.status(200).send({
    status: true,
    statusCode: 201,
    message: 'Data inserted Successfully',
    data: insertUser
  });
}

const changePassword = async (req, res) => {
  const userInfo = req.user;
  const getRoles = await listRolesPermission(userInfo.roleUuid);

  const param = { user: userInfo, getRoles: getRoles, pageTitle: 'Change Password', }
  res.render('pages/auth/change-password', param);
}

const processChangePassword = async (req, res) => {
  const uuid = req.body.uuid;
  const password = req.body.password;
  const password_confirmation = req.body.password_confirmation;

  if(password_confirmation != password) {
    req.flash('error_confirmation', 'Password confirmation is not the same with password !!!');
    res.redirect('back');
  }
  
  const salt = bcrypt.genSaltSync(10);//or your salt constant
  const hashPassword = bcrypt.hashSync(password, salt);

  const updatePassword = await prisma.users.update({
    where: {
      uuid: uuid,
    },
    data: {
      password : hashPassword,
      salt: salt,
    }
  })

  if (updatePassword){
    req.flash('success', 'Change password successfully...');
    res.redirect('back');
  }
}

module.exports = { 
    createUser,
    changePassword,
    processChangePassword,
};