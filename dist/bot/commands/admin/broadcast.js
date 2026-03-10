"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastMessage = broadcastMessage;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
async function broadcastMessage(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the broadcast content.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length === 0) {
        await ctx.reply('Usage: /broadcast <message>');
        return;
    }
    const message = args.join(' ');
    try {
        // Get all active users (those who have interacted with the bot)
        const allUsers = await database_1.db.select({ telegramId: schema_1.users.telegramId })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)(
        // optionally exclude banned users? We'll include all.
        ));
        if (allUsers.length === 0) {
            await ctx.reply('No active users to broadcast to.');
            return;
        }
        await ctx.reply(`📢 Broadcasting to ${allUsers.length} users...`);
        let sent = 0;
        let failed = 0;
        for (const user of allUsers) {
            try {
                await ctx.telegram.sendMessage(user.telegramId, message);
                sent++;
            }
            catch (err) {
                failed++;
                logger_1.default.warn({ err, telegramId: user.telegramId }, 'Broadcast failed for user');
            }
            // Small delay to avoid hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        logger_1.default.info({ admin: ctx.from?.id, sent, failed }, 'Broadcast completed');
        await ctx.reply(`✅ Broadcast complete. Sent: ${sent}, Failed: ${failed}`);
    }
    catch (error) {
        logger_1.default.error(error, 'Broadcast error');
        await ctx.reply('❌ Failed to broadcast message.');
    }
}
