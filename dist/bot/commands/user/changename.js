"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changenameCommand = changenameCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
async function changenameCommand(ctx) {
    const dbUser = ctx.dbUser;
    if (!dbUser) {
        await ctx.reply('You need to be logged in to change your name.');
        return;
    }
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with your new name.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length === 0) {
        await ctx.reply('Usage: /changename <new_name>');
        return;
    }
    const newName = args.join(' ').trim();
    if (newName.length > 255) {
        await ctx.reply('Name is too long (max 255 characters).');
        return;
    }
    try {
        await database_1.db.update(schema_1.users)
            .set({ name: newName })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, dbUser.id));
        logger_1.default.info({ userId: dbUser.id, newName }, 'User changed name');
        await ctx.reply(`✅ Your name has been updated to: ${newName}`);
    }
    catch (error) {
        logger_1.default.error(error, 'Change name error');
        await ctx.reply('❌ Failed to update name. Please try again later.');
    }
}
