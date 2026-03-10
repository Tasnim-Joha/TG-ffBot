"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.faqCommand = faqCommand;
const settings_1 = require("../../../config/settings");
const logger_1 = __importDefault(require("../../../logger"));
async function faqCommand(ctx) {
    // FAQ command doesn't require arguments, but still good to check if it's a text message.
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please use /faq to see the FAQ.');
        return;
    }
    try {
        const faqText = settings_1.settings.get('faq_text');
        if (!faqText) {
            await ctx.reply('FAQ not available at the moment. Please try again later.');
            return;
        }
        await ctx.reply(faqText, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.error(error, 'FAQ command error');
        await ctx.reply('❌ Failed to load FAQ.');
    }
}
