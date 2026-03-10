"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndSendOtp = generateAndSendOtp;
exports.verifyOtpAndCreateUser = verifyOtpAndCreateUser;
exports.verifyOtpForLogin = verifyOtpForLogin;
exports.setUserLoggedIn = setUserLoggedIn;
exports.setUserLoggedOut = setUserLoggedOut;
const database_1 = require("../config/database");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const email_1 = require("./email");
const crypto_1 = require("crypto");
const OTP_EXPIRY_MINUTES = 10; // will be overridden by settings later
async function generateAndSendOtp(email, telegramId, type) {
    // Delete any existing unused OTPs for this email+telegram
    await database_1.db.delete(schema_1.otpTokens).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.otpTokens.email, email), (0, drizzle_orm_1.eq)(schema_1.otpTokens.telegramId, telegramId), (0, drizzle_orm_1.eq)(schema_1.otpTokens.type, type), (0, drizzle_orm_1.isNull)(schema_1.otpTokens.usedAt)));
    const token = (0, crypto_1.randomInt)(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await database_1.db.insert(schema_1.otpTokens).values({
        telegramId,
        email,
        token,
        type,
        expiresAt,
    });
    const subject = type === 'register' ? 'Registration OTP' : 'Login OTP';
    const html = `<p>Your OTP code is: <strong>${token}</strong></p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`;
    await (0, email_1.sendEmail)(email, subject, html);
}
async function verifyOtpAndCreateUser(email, token, telegramId, username) {
    const now = new Date();
    const [otp] = await database_1.db.select()
        .from(schema_1.otpTokens)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.otpTokens.email, email), (0, drizzle_orm_1.eq)(schema_1.otpTokens.token, token), (0, drizzle_orm_1.eq)(schema_1.otpTokens.telegramId, telegramId), (0, drizzle_orm_1.eq)(schema_1.otpTokens.type, 'register'), (0, drizzle_orm_1.isNull)(schema_1.otpTokens.usedAt), (0, drizzle_orm_1.gt)(schema_1.otpTokens.expiresAt, now)))
        .limit(1);
    if (!otp) {
        return { success: false, message: 'Invalid or expired OTP.' };
    }
    // Mark OTP as used
    await database_1.db.update(schema_1.otpTokens)
        .set({ usedAt: now })
        .where((0, drizzle_orm_1.eq)(schema_1.otpTokens.id, otp.id));
    // Create the user
    const [newUser] = await database_1.db.insert(schema_1.users).values({
        telegramId,
        email,
        name: username,
        role: 'user',
        isLoggedIn: 1,
        lastActivity: now,
        sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }).$returningId();
    if (!newUser?.id) {
        return { success: false, message: 'Failed to create user account.' };
    }
    return { success: true, message: 'Registration successful!', userId: newUser.id };
}
async function verifyOtpForLogin(email, token, telegramId) {
    const now = new Date();
    const [otp] = await database_1.db.select()
        .from(schema_1.otpTokens)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.otpTokens.email, email), (0, drizzle_orm_1.eq)(schema_1.otpTokens.token, token), (0, drizzle_orm_1.eq)(schema_1.otpTokens.telegramId, telegramId), (0, drizzle_orm_1.eq)(schema_1.otpTokens.type, 'login'), (0, drizzle_orm_1.isNull)(schema_1.otpTokens.usedAt), (0, drizzle_orm_1.gt)(schema_1.otpTokens.expiresAt, now)))
        .limit(1);
    if (!otp) {
        return { success: false, message: 'Invalid or expired OTP.' };
    }
    await database_1.db.update(schema_1.otpTokens)
        .set({ usedAt: now })
        .where((0, drizzle_orm_1.eq)(schema_1.otpTokens.id, otp.id));
    const user = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.telegramId, telegramId)).limit(1);
    if (user.length === 0) {
        return { success: false, message: 'User account not found.' };
    }
    // Update login status
    await setUserLoggedIn(user[0].id);
    return { success: true, message: 'Login successful!', userId: user[0].id };
}
async function setUserLoggedIn(userId) {
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await database_1.db.update(schema_1.users)
        .set({
        isLoggedIn: 1,
        lastActivity: new Date(),
        sessionExpiresAt,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
}
async function setUserLoggedOut(userId) {
    await database_1.db.update(schema_1.users)
        .set({ isLoggedIn: 0, sessionExpiresAt: null })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
}
