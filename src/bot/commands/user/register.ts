import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import { generateAndSendOtp } from '../../../services/otp';
import { isValidEmail } from '../../../validators/email';
import logger from '../../../logger';

export async function registerCommand(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('Unable to identify you. Please /start again.');
    return;
  }

  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with your email.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1 || !args[0]) {
    await ctx.reply('Usage: /register <email>');
    return;
  }

  const email = args[0].toLowerCase();

  // Validate email
  if (!isValidEmail(email)) {
    await ctx.reply('Please enter a valid email address.');
    return;
  }

  try {
    // Check if email already registered
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      await ctx.reply('This email is already registered. Use /login <email> instead.');
      return;
    }

    await generateAndSendOtp(email, telegramId, 'register');
    logger.info({ telegramId, email }, 'Registration OTP sent');
    await ctx.reply(`✅ OTP sent to ${email}. Please check your inbox and use /verify <otp>`);
  } catch (error) {
    logger.error(error, 'Registration error');
    await ctx.reply('Failed to send OTP. Please try again later.');
  }
}