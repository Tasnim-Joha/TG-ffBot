import { Context } from 'telegraf';
import { settings } from '../../../config/settings';
import logger from '../../../logger';

export async function supportCommand(ctx: Context) {
  const dbUser = (ctx as any).dbUser;
  if (!dbUser) {
    await ctx.reply('You need to be logged in to use support.');
    return;
  }

  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with your support request.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length === 0) {
    await ctx.reply('Usage: /support <your message>');
    return;
  }
  const message = args.join(' ');
  const supportChatId = settings.get<number>('support_chat_id');
  if (!supportChatId) {
    await ctx.reply('Support chat is not configured. Please try again later.');
    return;
  }
  const user = ctx.from;
  const userInfo = `User: ${user?.first_name} ${user?.last_name || ''} (@${user?.username || 'N/A'}) [ID: ${user?.id}]`;
  try {
    await ctx.telegram.sendMessage(supportChatId, `📩 New support message:\n${userInfo}\n\nMessage: ${message}`);
    await ctx.reply('✅ Your message has been sent to support. We will get back to you soon.');
    logger.info({ userId: user?.id }, 'Support message sent');
  } catch (error) {
    logger.error(error, 'Support command error');
    await ctx.reply('❌ Failed to send support message. Please try again later.');
  }
}