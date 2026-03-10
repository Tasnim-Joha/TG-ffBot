import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import logger from '../../../logger';

export async function balanceCommand(ctx: Context) {
  // The authenticate middleware will attach dbUser to ctx
  const dbUser = (ctx as any).dbUser;
  if (!dbUser) {
    await ctx.reply('You need to be logged in to check your balance.');
    return;
  }

  try {
    // Fetch the latest balance from the database (in case it changed since last request)
    const [user] = await db.select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, dbUser.id))
      .limit(1);

    if (!user) {
      await ctx.reply('User not found.');
      return;
    }

    const balance = parseFloat(user.balance).toFixed(2);
    await ctx.reply(`💰 Your current wallet balance is *৳${balance}*.`, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'Balance command error');
    await ctx.reply('Failed to fetch balance. Please try again later.');
  }
}