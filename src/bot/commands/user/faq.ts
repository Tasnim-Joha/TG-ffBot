import { Context } from 'telegraf';
import { settings } from '../../../config/settings';
import logger from '../../../logger';

export async function faqCommand(ctx: Context) {
  // FAQ command doesn't require arguments, but still good to check if it's a text message.
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please use /faq to see the FAQ.');
    return;
  }

  try {
    const faqText = settings.get<string>('faq_text');
    if (!faqText) {
      await ctx.reply('FAQ not available at the moment. Please try again later.');
      return;
    }
    await ctx.reply(faqText, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'FAQ command error');
    await ctx.reply('❌ Failed to load FAQ.');
  }
}