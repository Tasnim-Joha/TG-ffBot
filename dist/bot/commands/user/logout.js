"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutCommand = logoutCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const otp_1 = require("../../../services/otp");
const logger_1 = __importDefault(require("../../../logger"));
async function logoutCommand(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.reply('Unable to identify you. Please /start again.');
        return;
    }
    try {
        const user = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.telegramId, telegramId)).limit(1);
        if (user.length === 0) {
            await ctx.reply('You are not registered. Use /register first.');
            return;
        }
        const dbUser = user[0];
        if (!dbUser) {
            await ctx.reply('User not found.');
            return;
        }
        if (!dbUser.isLoggedIn) {
            await ctx.reply('You are already logged out.');
            return;
        }
        await (0, otp_1.setUserLoggedOut)(dbUser.id);
        logger_1.default.info({ telegramId }, 'User logged out');
        await ctx.reply('✅ You have been logged out. Use /login to log in again.');
    }
    catch (error) {
        logger_1.default.error(error, 'Logout error');
        await ctx.reply('Failed to log out. Please try again later.');
    }
}
