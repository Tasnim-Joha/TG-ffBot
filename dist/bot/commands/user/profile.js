"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileCommand = profileCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
async function profileCommand(ctx) {
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
        const status = dbUser.isLoggedIn ? '✅ Logged in' : '❌ Logged out';
        const email = dbUser.email || 'Not set';
        const name = dbUser.name || 'Not set';
        const balance = dbUser.balance || '0.00';
        const message = `
👤 *Profile*
ID: \`${dbUser.id}\`
Name: ${name}
Email: ${email}
Balance: ৳${balance}
Status: ${status}
Registered: ${dbUser.createdAt?.toLocaleString() || 'Unknown'}
    `;
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.error(error, 'Profile error');
        await ctx.reply('Failed to fetch profile. Please try again later.');
    }
}
