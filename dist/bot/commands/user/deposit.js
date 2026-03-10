"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.depositCommand = depositCommand;
const piprapay_1 = require("../../../services/piprapay");
const logger_1 = __importDefault(require("../../../logger"));
async function depositCommand(ctx) {
    const dbUser = ctx.dbUser;
    if (!dbUser) {
        await ctx.reply('You need to be logged in to deposit.');
        return;
    }
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the amount.');
        return;
    }
    const parts = ctx.message.text.split(' ').slice(1);
    if (parts.length === 0) {
        await ctx.reply('Usage: /deposit <amount> [currency]\nExample: /deposit 100 BDT');
        return;
    }
    const amountStr = parts[0];
    const currency = parts[1]?.toUpperCase() || 'BDT';
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        await ctx.reply('Please enter a valid positive amount.');
        return;
    }
    // Optional: validate currency if needed (BDT, USD, INR...)
    const supportedCurrencies = ['BDT', 'USD', 'INR'];
    if (!supportedCurrencies.includes(currency)) {
        await ctx.reply(`Unsupported currency. Supported: ${supportedCurrencies.join(', ')}`);
        return;
    }
    try {
        const { pp_url, pp_id } = await (0, piprapay_1.createPipraPayPayment)(dbUser.id, amount, currency);
        logger_1.default.info({ userId: dbUser.id, amount, currency, pp_id }, 'Deposit initiated');
        await ctx.reply(`✅ Deposit request created for ${currency} ${amount}.\n\n` +
            `Please complete payment using the link below:\n${pp_url}\n\n` +
            `Your balance will be updated automatically once the payment is confirmed.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Deposit command error');
        await ctx.reply(`❌ Failed to initiate deposit: ${error.message}`);
    }
}
