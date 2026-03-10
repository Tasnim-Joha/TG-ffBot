import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users } from '../../../models/schema';
import { eq, and } from 'drizzle-orm';
import logger from '../../../logger';

export async function broadcastMessage(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the broadcast content.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length === 0) {
    await ctx.reply('Usage: /broadcast <message>');
    return;
  }

  const message = args.join(' ');

  try {
    // Get all active users (those who have interacted with the bot)
    const allUsers = await db.select({ telegramId: users.telegramId })
      .from(users)
      .where(and(
        // optionally exclude banned users? We'll include all.
      ));

    if (allUsers.length === 0) {
      await ctx.reply('No active users to broadcast to.');
      return;
    }

    await ctx.reply(`📢 Broadcasting to ${allUsers.length} users...`);

    let sent = 0;
    let failed = 0;

    for (const user of allUsers) {
      try {
        await ctx.telegram.sendMessage(user.telegramId!, message);
        sent++;
      } catch (err) {
        failed++;
        logger.warn({ err, telegramId: user.telegramId }, 'Broadcast failed for user');
      }
      // Small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    logger.info({ admin: ctx.from?.id, sent, failed }, 'Broadcast completed');
    await ctx.reply(`✅ Broadcast complete. Sent: ${sent}, Failed: ${failed}`);
  } catch (error) {
    logger.error(error, 'Broadcast error');
    await ctx.reply('❌ Failed to broadcast message.');
  }
}