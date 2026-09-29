const prisma = require('../libs/prisma');

const moment = require('moment');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { listRolesPermission } = require('../helper/roles-permission');
const { sendEmail } = require('../helper/send-email');

var logger = require('../libs/logger'),
    csrf = require('../libs/csrf'),
    csrfProtection = csrf({
      cookie: true
    }),
    uuid = require('uuid');

const getLogin = (req, res) => {
    try {
        logger.debug("get login page", "success");
        const message = "";
        res.render('pages/login', {
            message: message,
            error: false
        })
    } catch (e) {
        logger.error(e)        
    }
}

const postLogin = (req, res) => {
    try {
        logger.debug("post login page", "success");
        let email = req.body.email;
        let password = req.body.password;
        
        res.render('pages/index', {
            error: false
        })
    } catch (e) {
        logger.error(e)        
    }
}

const getForgotPassword = async (req, res) => {
    try {
        logger.debug("forgot password page", "success");
        res.render('pages/forgot-password', {
            error: false
        })
    } catch (e) {
        logger.error(e)        
    }
}

const postForgotPassword = async (req, res) => {
    try {
        const email = req.body.email;

        const getUsers = await prisma.users.findFirst({
            where: { email },
            select: { email: true },
        });

        // Anti-enumeration: pesan selalu sama terlepas email ditemukan atau tidak.
        // Jika tidak ditemukan, return lebih awal tanpa mengirim email.
        if (!getUsers) {
            req.flash('success', 'Jika email terdaftar, link reset telah dikirim ke alamat email Anda.');
            return res.redirect('back');
        }

        let nowDate = new Date();
        const passwordResetToken = crypto.randomBytes(40).toString('hex');
        let passwordResetAt = moment(nowDate).add(moment.duration(1, 'hours'));

        await prisma.users.update({
            where: { email },
            data: {
                passwordResetToken,
                passwordResetAt: moment.utc(passwordResetAt).toDate(),
            }
        });
        const sendingEmail = await sendEmail(passwordResetToken, email);
        logger.info('Email sent : ' + sendingEmail.response);

        req.flash('success', 'Jika email terdaftar, link reset telah dikirim ke alamat email Anda.');
        res.redirect('back');
    } catch (e) {
        logger.error(e);
        req.flash('error', 'Terjadi kesalahan, silakan coba lagi.');
        res.redirect('back');
    }
}

const getResetPassword = async (req, res) => {
    try {
        logger.debug("visit reset password page", "success");
        const token = req.params.token;
        const expiredAt = new Date();
        const isExistDataToken = await prisma.$queryRaw`SELECT passwordResetToken, uuid FROM users WHERE passwordResetToken = ${token} AND passwordResetAt > ${expiredAt};`;
        if (isExistDataToken.length == 0) {
            res.render('pages/reset-password-error', {
                error: false,
                token,
            })    
        } else {
            if (isExistDataToken[0].passwordResetToken != '') {
                res.render('pages/reset-password', {
                    error: false,
                    token,
                    uuid: isExistDataToken[0].uuid,
                })    
            } else {
                res.render('pages/reset-password-error', {
                    error: false,
                    token,
                })    
    
            }    
        }

    } catch (e) {
        logger.error(e)        
    }
}

const postResetPassword = async (req, res) => {
    try {
        const { password, password_confirmation } = req.body;
        const uuid = req.body.uuid;

        if (password !== password_confirmation) {
            req.flash('error', 'The password & confirmation are not the same.');
            return res.redirect('back');
        }

        // SECURITY: verifikasi token & expiry ulang di POST handler
        // (GET handler sudah cek, tapi token bisa saja expired di antara GET & POST).
        // Token di-bind ke NILAINYA (bukan sekadar not null) agar uuid saja
        // tidak cukup untuk reset — mencegah penyalahgunaan tanpa token dari email.
        const userWithValidToken = await prisma.users.findFirst({
            where: {
                uuid,
                passwordResetAt: { gt: new Date() },
                passwordResetToken: String(req.body.token || ''),
            },
            select: { id: true },
        });

        if (!userWithValidToken) {
            req.flash('error', 'Link reset password sudah kedaluwarsa atau tidak valid. Silakan minta link baru.');
            return res.redirect('/forgot-password');
        }

        const salt = bcrypt.genSaltSync(10);
        const hashPassword = bcrypt.hashSync(password, salt);

        await prisma.users.update({
            where: { uuid },
            data: {
                passwordResetToken: null,
                passwordResetAt: null,
                password: hashPassword,
                salt,
            }
        });

        req.flash('success', 'The password reset successfully.');
        res.redirect('/');
    } catch (e) {
        logger.error(e);
        req.flash('error', 'Terjadi kesalahan, silakan coba lagi.');
        res.redirect('back');
    }
}


const getAbout = (req, res) => {
    res.render('pages/about');
}

const getHome = async (req, res) => {
    try {
        if (!req.user) { 
            return res.render('pages/login'); 
        }  
        const userInfo = req.user;
        const getEmployeeData = await prisma.users.findFirst({
            where: {
                uuid: userInfo.uuid,
            },
            select: {
                id: true,
                uuid: true,
                employeeId: true,
                status: true,
                role: {
                    select: {
                        id: true,
                        roleName: true,
                    },
                },
                fullName: true,
                joinDate: true,
                email: true,
                mobilePhone: true,
                dob: true,
                placeOfBirth: true,
                personalIdType: true,
                personalIdNumber: true,
                address: true,
                employmentStatus: true,
                image: true,
                businessUnit: {
                    select: {
                        id: true,
                        businessUnitName: true,
                    },
                },
                division: {
                    select: {
                        id: true,
                        divisionName: true,
                    },
                },
                jobTitle: {
                    select: {
                        id: true,
                        jobTitleName: true,
                    },
                },
                basicSalary: true,
                npwp: true,
                annualLeave: true,
                annualLeaveBalance: true,
                sickLeave: true,
                sickLeaveBalance: true,
            }
        })
    
        let str = getEmployeeData.fullName;
        let matches = str.match(/\b(\w)/g);
        let acronymFullName = matches.join('');
      
        const query = req.query;
        let search = query.search;
    
        const page = parseInt(query.page) || 0;
        const limit = parseInt(query.limit) || 10;
        const skip = page * limit;
    
        const yearDate = moment().format('YYYY');
        let totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE requestLeave.employeeId = ${userInfo.id} AND year(startDuration) = ${yearDate};`
        let getRequestLeave = await prisma.$queryRaw`SELECT requestLeave.createdAt, requestLeave.id, requestLeave.uuid, leaveTypeDescription, startDuration, endDuration, days, leaveDescription, requestLeave.employeeId, fullName, businessUnitName, divisionName, jobTitleName, isApproved, approvedBy, approvedDate, commentsBySupervisor, isApprovedByHR FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE requestLeave.employeeId = ${userInfo.id} AND year(startDuration) = ${yearDate} ORDER BY createdAt DESC LIMIT ${limit};`  
        if (skip > 0)
            getRequestLeave = await prisma.$queryRaw`SELECT requestLeave.createdAt, requestLeave.id, requestLeave.uuid, leaveTypeDescription, startDuration, endDuration, days, leaveDescription, requestLeave.employeeId, fullName, businessUnitName, divisionName, jobTitleName, isApproved, approvedBy, approvedDate, commentsBySupervisor, isApprovedByHR FROM requestLeave JOIN users ON requestLeave.employeeId = users.id WHERE requestLeave.employeeId = ${userInfo.id} AND year(startDuration) = ${yearDate} ORDER BY createdAt DESC LIMIT ${skip}, ${limit};` 
        
        let totalPage
        let totalRecords
        totalCount.forEach((x) => {
            totalRecords = x.total;
            totalPage = Math.ceil(Number(x.total) / limit);
        })
        let currentPage = page || 0;
    
        const metaDataRequestLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords};
        const listOfRequestLeave = { meta : metaDataRequestLeave, data: getRequestLeave};
        
        totalCount = await prisma.$queryRaw`SELECT count(*) as total FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE requestOtherLeave.employeeId = ${userInfo.id} AND year(startDuration) = ${yearDate};`
        let getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.createdAt, requestOtherLeave.id, requestOtherLeave.uuid, otherleaveTypeDescription, startDuration, endDuration, days, leaveDescription, requestOtherLeave.employeeId, fullName, businessUnitName, divisionName, jobTitleName, isApproved, approvedBy, approvedDate, commentsBySupervisor, isApprovedByHR FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE requestOtherLeave.employeeId = ${userInfo.id} AND year(startDuration) = ${yearDate} ORDER BY createdAt DESC limit ${limit};`
        if (skip > 0)
            getRequestOtherLeave = await prisma.$queryRaw`SELECT requestOtherLeave.createdAt, requestOtherLeave.id, requestOtherLeave.uuid, otherleaveTypeDescription, startDuration, endDuration, days, leaveDescription, requestOtherLeave.employeeId, fullName, businessUnitName, divisionName, jobTitleName, isApproved, approvedBy, approvedDate, commentsBySupervisor, isApprovedByHR FROM requestOtherLeave JOIN users ON requestOtherLeave.employeeId = users.id WHERE requestOtherLeave.employeeId = ${userInfo.id} AND year(startDuration) = ${yearDate} ORDER BY createdAt DESC limit ${skip}, ${limit};`
    
        totalCount.forEach((x) => {
            totalRecords = x.total;
            totalPage = Math.ceil(Number(x.total) / limit);
        })
        currentPage = page || 0;
    
        const metaDataRequestOtherLeave = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalRecords};
        const listOfRequestOtherLeave = { meta : metaDataRequestOtherLeave, data: getRequestOtherLeave};
    
        let getRoles = {
            'status': false, 
            'statusCode': 404,
            'message': 'Get data unsecesfully',
            'data': []
        };
        getRoles = await listRolesPermission(userInfo.roleUuid);
        res.render('pages/index', { user: userInfo, getRoles: getRoles, moment: moment, pageTitle: 'Dashboard', acronymFullName: acronymFullName, employeeData: getEmployeeData, listOfRequestLeave: listOfRequestLeave, listOfRequestOtherLeave });    
    } catch (e) {
        logger.error(e);
        logger.error(e)
    }
}

module.exports = { 
    getHome, 
    getLogin,
    postLogin,
    getForgotPassword,
    postForgotPassword,
    getResetPassword,
    postResetPassword,
    //getAbout,
};