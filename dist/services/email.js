"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetTransporter = resetTransporter;
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const settings_1 = require("../config/settings");
let transporter = null;
function cleanString(str) {
    // Remove surrounding double quotes if present
    return str.replace(/^"(.*)"$/, '$1');
}
async function getTransporter() {
    if (transporter)
        return transporter;
    const hostRaw = settings_1.settings.get('smtp_host');
    const port = settings_1.settings.get('smtp_port', 587);
    const userRaw = settings_1.settings.get('smtp_user');
    const passRaw = settings_1.settings.get('smtp_pass');
    const fromRaw = settings_1.settings.get('smtp_from');
    console.log('SMTP raw settings:', { hostRaw, port, userRaw, passRaw, fromRaw });
    const host = cleanString(hostRaw);
    const user = cleanString(userRaw);
    const pass = cleanString(passRaw);
    const from = fromRaw ? cleanString(fromRaw) : user;
    if (!host || !user || !pass) {
        throw new Error('SMTP settings not configured');
    }
    console.log('SMTP cleaned settings:', { host, port, user, from });
    // Use secure: true only for port 465, false for other ports (STARTTLS)
    const secure = port === 465;
    transporter = nodemailer_1.default.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
            rejectUnauthorized: true, // keep true in production; set false only for testing
        },
        connectionTimeout: 10000, // 10 seconds
    });
    // Verify connection
    try {
        await transporter.verify();
        console.log('✅ SMTP connection verified');
    }
    catch (err) {
        console.error('❌ SMTP connection failed:', err);
        transporter = null;
        throw err;
    }
    return transporter;
}
async function resetTransporter() {
    transporter = null;
}
async function sendEmail(to, subject, html) {
    try {
        const mailer = await getTransporter();
        const from = cleanString(settings_1.settings.get('smtp_from') || settings_1.settings.get('smtp_user'));
        await mailer.sendMail({ from, to, subject, html });
        console.log(`✅ Email sent to ${to}`);
    }
    catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
}
