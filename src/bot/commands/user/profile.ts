import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import logger from '../../../logger';

export async function profileCommand(ctx: Context) {
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

    const status = dbUser.isLoggedIn ? '✅ Logged in' : '❌ Logged out';
    const email = dbUser.email || 'Not set';
    const name = dbUser.name || 'Not set';
    const balance = dbUser.balance || '0.00';

    const message = `
👤 *Profile*
ID: \`${dbUser.id}\`
Name: ${name}
Email: ${email}
Balance: ৳${balance}
Status: ${status}
Registered: ${dbUser.createdAt?.toLocaleString() || 'Unknown'}
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'Profile error');
    await ctx.reply('Failed to fetch profile. Please try again later.');
  }
}