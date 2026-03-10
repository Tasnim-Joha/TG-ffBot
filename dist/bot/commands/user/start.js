"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCommand = startCommand;
const logger_1 = __importDefault(require("../../../logger"));
async function startCommand(ctx) {
    try {
        const username = ctx.from?.first_name || ctx.from?.username || 'User';
        logger_1.default.info({ telegramId: ctx.from?.id }, '/start command');
        await ctx.reply(`Welcome ${username}! 👋\n\n` +
            `Please register using /register <your_email> to start using the bot.\n` +
            `Use /help to see all available commands.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Error in startCommand');
        // If the error is due to user deactivated, we can't reply anyway.
        // Just log and ignore.
    }
}
