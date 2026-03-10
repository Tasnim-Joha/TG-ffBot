"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkuidCommand = checkuidCommand;
const uid_checker_1 = require("../../../services/uid-checker");
const logger_1 = __importDefault(require("../../../logger"));
async function checkuidCommand(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the UID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length === 0) {
        await ctx.reply('Usage: /checkuid <uid> [region]');
        return;
    }
    const uid = args[0];
    if (!uid) {
        await ctx.reply('UID is required.');
        return;
    }
    const region = args[1] || 'SG'; // optional region, default SG
    if (!/^\d+$/.test(uid)) {
        await ctx.reply('Invalid UID. Must contain only numbers.');
        return;
    }
    try {
        await ctx.reply('🔍 Checking UID, please wait...');
        const playerInfo = await (0, uid_checker_1.checkUid)(uid, region);
        await ctx.reply(`✅ Player found!\n\n` +
            `Name: ${playerInfo.name}\n` +
            `Level: ${playerInfo.level || 'N/A'}\n` +
            `Region: ${playerInfo.region || region}`);
    }
    catch (error) {
        logger_1.default.error({ error, uid, region }, 'UID check failed');
        await ctx.reply(`❌ Failed to check UID: ${error.message}`);
    }
}
