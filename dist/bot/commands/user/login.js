"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginCommand = loginCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const otp_1 = require("../../../services/otp");
const email_1 = require("../../../validators/email");
const logger_1 = __importDefault(require("../../../logger"));
async function loginCommand(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.reply('Unable to identify you. Please /start again.');
        return;
    }
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with your email.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1 || !args[0]) {
        await ctx.reply('Usage: /login <email>');
        return;
    }
    const email = args[0].toLowerCase();
    if (!(0, email_1.isValidEmail)(email)) {
        await ctx.reply('Please enter a valid email address.');
        return;
    }
    try {
        const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
        if (!user) {
            await ctx.reply('No account found with that email. Please /register first.');
            return;
        }
        if (user.telegramId !== telegramId) {
            await ctx.reply('This email is linked to another Telegram account. Please contact support.');
            return;
        }
        await (0, otp_1.generateAndSendOtp)(email, telegramId, 'login');
        logger_1.default.info({ telegramId, email }, 'Login OTP sent');
        await ctx.reply(`✅ OTP sent to ${email}. Please check your inbox and use /verify <otp>`);
    }
    catch (error) {
        logger_1.default.error(error, 'Login error');
        await ctx.reply('❌ Failed to send OTP. Please try again later.');
    }
}
