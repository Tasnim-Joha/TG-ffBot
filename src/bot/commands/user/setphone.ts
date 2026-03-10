import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import logger from '../../../logger';

export async function setPhoneCommand(ctx: Context) {
  const dbUser = (ctx as any).dbUser;
  if (!dbUser) {
    await ctx.reply('You need to be logged in to set your phone.');
    return;
  }

  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with your phone number.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1 || !args[0]) {
    await ctx.reply('Usage: /setphone <phone_number>');
    return;
  }

  const phone = args[0];
  // Basic validation – you can improve
  if (!/^01[3-9]\d{8}$/.test(phone) && !/^\+?8801[3-9]\d{8}$/.test(phone)) {
    await ctx.reply('Please enter a valid Bangladeshi phone number (e.g., 01300000000).');
    return;
  }

  try {
    await db.update(users)
      .set({ phone })
      .where(eq(users.id, dbUser.id));
    logger.info({ userId: dbUser.id, phone }, 'Phone number set');
    await ctx.reply('✅ Phone number saved.');
  } catch (error) {
    logger.error(error, 'Set phone error');
    await ctx.reply('❌ Failed to save phone number.');
  }
}