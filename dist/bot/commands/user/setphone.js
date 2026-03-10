"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPhoneCommand = setPhoneCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
async function setPhoneCommand(ctx) {
    const dbUser = ctx.dbUser;
    if (!dbUser) {
        await ctx.reply('You need to be logged in to set your phone.');
        return;
    }
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with your phone number.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1 || !args[0]) {
        await ctx.reply('Usage: /setphone <phone_number>');
        return;
    }
    const phone = args[0];
    // Basic validation – you can improve
    if (!/^01[3-9]\d{8}$/.test(phone) && !/^\+?8801[3-9]\d{8}$/.test(phone)) {
        await ctx.reply('Please enter a valid Bangladeshi phone number (e.g., 01300000000).');
        return;
    }
    try {
        await database_1.db.update(schema_1.users)
            .set({ phone })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, dbUser.id));
        logger_1.default.info({ userId: dbUser.id, phone }, 'Phone number set');
        await ctx.reply('✅ Phone number saved.');
    }
    catch (error) {
        logger_1.default.error(error, 'Set phone error');
        await ctx.reply('❌ Failed to save phone number.');
    }
}
