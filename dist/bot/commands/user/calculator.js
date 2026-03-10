"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatorCommand = calculatorCommand;
const mathjs_1 = require("mathjs");
const logger_1 = __importDefault(require("../../../logger"));
async function calculatorCommand(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with an expression.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length === 0) {
        await ctx.reply('Usage: /calc <expression> (e.g., /calc 2+2*5)');
        return;
    }
    const expression = args.join(' ');
    try {
        const result = (0, mathjs_1.evaluate)(expression);
        await ctx.reply(`🧮 *Result:* ${result}`, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.warn({ expression }, 'Calculator error');
        await ctx.reply('❌ Invalid expression. Please use numbers and basic operators (+, -, *, /, parentheses).');
    }
}
