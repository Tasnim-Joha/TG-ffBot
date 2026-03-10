import { Context } from 'telegraf';
import logger from '../../../logger';

export async function startCommand(ctx: Context) {
  try {
    const username = ctx.from?.first_name || ctx.from?.username || 'User';
    logger.info({ telegramId: ctx.from?.id }, '/start command');
    await ctx.reply(
      `Welcome ${username}! 👋\n\n` +
      `Please register using /register <your_email> to start using the bot.\n` +
      `Use /help to see all available commands.`
    );
  } catch (error) {
    logger.error(error, 'Error in startCommand');
    // If the error is due to user deactivated, we can't reply anyway.
    // Just log and ignore.
  }
}