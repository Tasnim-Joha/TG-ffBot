import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import { setUserLoggedOut } from '../../../services/otp';
import logger from '../../../logger';

export async function logoutCommand(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('Unable to identify you. Please /start again.');
    return;
  }

  try {
    const user = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    if (user.length === 0) {
      await ctx.reply('You are not registered. Use /register first.');
      return;
    }

    const dbUser = user[0];
    if (!dbUser) {
      await ctx.reply('User not found.');
      return;
    }

    if (!dbUser.isLoggedIn) {
      await ctx.reply('You are already logged out.');
      return;
    }

    await setUserLoggedOut(dbUser.id);
    logger.info({ telegramId }, 'User logged out');
    await ctx.reply('✅ You have been logged out. Use /login to log in again.');
  } catch (error) {
    logger.error(error, 'Logout error');
    await ctx.reply('Failed to log out. Please try again later.');
  }
}