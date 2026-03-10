"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemCommand = redeemCommand;
const redeem_1 = require("../../../services/redeem");
const logger_1 = __importDefault(require("../../../logger"));
async function redeemCommand(ctx) {
    const dbUser = ctx.dbUser;
    if (!dbUser) {
        await ctx.reply('You need to be logged in to redeem a code.');
        return;
    }
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the code.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 1 || !args[0]) {
        await ctx.reply('Usage: /redeem <code> [uid]');
        return;
    }
    const code = args[0];
    const uid = args[1]; // optional
    try {
        const result = await (0, redeem_1.redeemExternalCode)(dbUser.id, code, uid);
        if (result.success) {
            await ctx.reply(`✅ ${result.message} (Order ID: ${result.orderId})`);
        }
        else {
            await ctx.reply(`❌ ${result.message}`);
        }
    }
    catch (error) {
        logger_1.default.error(error, 'Redeem command error');
        await ctx.reply(`❌ Redemption failed: ${error.message}`);
    }
}
