"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCommand = verifyCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const otp_1 = require("../../../services/otp");
const logger_1 = __importDefault(require("../../../logger"));
async function verifyCommand(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.reply('Unable to identify you. Please /start again.');
        return;
    }
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with your OTP.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1 || !args[0]) {
        await ctx.reply('Usage: /verify <otp>');
        return;
    }
    const token = args[0];
    // Find the latest unused OTP for this telegramId
    const now = new Date();
    const [pending] = await database_1.db.select()
        .from(schema_1.otpTokens)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.otpTokens.telegramId, telegramId), (0, drizzle_orm_1.eq)(schema_1.otpTokens.token, token), (0, drizzle_orm_1.isNull)(schema_1.otpTokens.usedAt), (0, drizzle_orm_1.gt)(schema_1.otpTokens.expiresAt, now)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.otpTokens.createdAt))
        .limit(1);
    if (!pending) {
        await ctx.reply('Invalid or expired OTP. Please try again.');
        return;
    }
    const username = ctx.from.first_name || ctx.from.username || 'User';
    let result;
    if (pending.type === 'register') {
        result = await (0, otp_1.verifyOtpAndCreateUser)(pending.email, token, telegramId, username);
    }
    else if (pending.type === 'login') {
        result = await (0, otp_1.verifyOtpForLogin)(pending.email, token, telegramId);
    }
    else {
        await ctx.reply('Invalid OTP type. Please try again.');
        return;
    }
    if (result.success) {
        logger_1.default.info({ telegramId, type: pending.type }, 'Verification successful');
        await ctx.reply(`✅ ${result.message} Use /help to see commands.`);
    }
    else {
        logger_1.default.warn({ telegramId, type: pending.type, error: result.message }, 'Verification failed');
        await ctx.reply(result.message);
    }
}
