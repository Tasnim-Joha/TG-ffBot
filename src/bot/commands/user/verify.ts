import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { otpTokens } from '../../../models/schema';
import { and, eq, gt, isNull, desc } from 'drizzle-orm';
import { verifyOtpAndCreateUser, verifyOtpForLogin } from '../../../services/otp';
import logger from '../../../logger';

export async function verifyCommand(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('Unable to identify you. Please /start again.');
    return;
  }

  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with your OTP.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1 || !args[0]) {
    await ctx.reply('Usage: /verify <otp>');
    return;
  }
  const token = args[0];

  // Find the latest unused OTP for this telegramId
  const now = new Date();
  const [pending] = await db.select()
    .from(otpTokens)
    .where(
      and(
        eq(otpTokens.telegramId, telegramId),
        eq(otpTokens.token, token),
        isNull(otpTokens.usedAt),
        gt(otpTokens.expiresAt, now)
      )
    )
    .orderBy(desc(otpTokens.createdAt))
    .limit(1);

  if (!pending) {
    await ctx.reply('Invalid or expired OTP. Please try again.');
    return;
  }

  const username = ctx.from.first_name || ctx.from.username || 'User';

  let result;
  if (pending.type === 'register') {
    result = await verifyOtpAndCreateUser(pending.email, token, telegramId, username);
  } else if (pending.type === 'login') {
    result = await verifyOtpForLogin(pending.email, token, telegramId);
  } else {
    await ctx.reply('Invalid OTP type. Please try again.');
    return;
  }

  if (result.success) {
    logger.info({ telegramId, type: pending.type }, 'Verification successful');
    await ctx.reply(`✅ ${result.message} Use /help to see commands.`);
  } else {
    logger.warn({ telegramId, type: pending.type, error: result.message }, 'Verification failed');
    await ctx.reply(result.message);
  }
}