import { Context } from 'telegraf';
import { db } from '../../config/database';
import { users } from '../../models/schema';
import { eq } from 'drizzle-orm';

export async function requireAuth(ctx: Context): Promise<boolean> {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('Unable to identify you. Please /start again.');
    return false;
  }

  const user = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
  if (user.length === 0) {
    await ctx.reply('You are not registered. Please use /register first.');
    return false;
  }

  const dbUser = user[0];
  if (!dbUser) {
    await ctx.reply('Error retrieving user data.');
    return false;
  }

  if (!dbUser.isLoggedIn) {
    await ctx.reply('You are not logged in. Please use /login.');
    return false;
  }

  // Check session expiry
  if (dbUser.sessionExpiresAt && new Date(dbUser.sessionExpiresAt) < new Date()) {
    // Session expired – automatically log out
    await db.update(users)
      .set({ isLoggedIn: 0, sessionExpiresAt: null })
      .where(eq(users.id, dbUser.id));
    await ctx.reply('Your session has expired. Please log in again with /login.');
    return false;
  }

  // Attach user to context for later use in command handlers
  (ctx as any).dbUser = dbUser;
  return true;
}