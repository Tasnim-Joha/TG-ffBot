import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import logger from '../../../logger';

export async function changenameCommand(ctx: Context) {
  const dbUser = (ctx as any).dbUser;
  if (!dbUser) {
    await ctx.reply('You need to be logged in to change your name.');
    return;
  }

  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with your new name.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length === 0) {
    await ctx.reply('Usage: /changename <new_name>');
    return;
  }
  const newName = args.join(' ').trim();
  if (newName.length > 255) {
    await ctx.reply('Name is too long (max 255 characters).');
    return;
  }

  try {
    await db.update(users)
      .set({ name: newName })
      .where(eq(users.id, dbUser.id));
    logger.info({ userId: dbUser.id, newName }, 'User changed name');
    await ctx.reply(`✅ Your name has been updated to: ${newName}`);
  } catch (error) {
    logger.error(error, 'Change name error');
    await ctx.reply('❌ Failed to update name. Please try again later.');
  }
}