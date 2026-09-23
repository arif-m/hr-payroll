var nodemailer = require('nodemailer');
const logger = require('../libs/logger');
require('dotenv').config();

async function sendEmail(token, sendTo) {
    try {
        const urlClient = process.env.URL_CLIENT || 'http://localhost:3000';
        const emailService = process.env.EMAIL_SERVICE || 'gmail';
        const emailUser = process.env.EMAIL_USER || 'memberid.meme@gmail.com';
        const passcode = process.env.EMAIL_PASSCODE || 'mjeoawyupnwrynau';
        const emailSender = process.env.EMAIL_SENDER || 'meme@gmail.com';
        var transporter = nodemailer.createTransport({
            service: emailService,
            auth: {
                user: emailUser,
                pass: passcode
            }
        });

        var mailOptions = {
            from: emailSender,
            to: sendTo,
            subject: 'Forgot password',
            text: "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            "http://" + urlClient + "/reset-password/" + token + "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n"
        };

        return transporter.sendMail(mailOptions);
    } catch (e) {
        logger.error(e);
        return e.message;
    }
}

module.exports = { sendEmail };
