import { Context } from 'telegraf';
import { createPipraPayPayment } from '../../../services/piprapay';
import logger from '../../../logger';

export async function depositCommand(ctx: Context): Promise<void> {
  const dbUser = (ctx as any).dbUser;
  if (!dbUser) {
    await ctx.reply('You need to be logged in to deposit.');
    return;
  }

  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the amount.');
    return;
  }

  const parts = ctx.message.text.split(' ').slice(1);
  if (parts.length === 0) {
    await ctx.reply('Usage: /deposit <amount> [currency]\nExample: /deposit 100 BDT');
    return;
  }

  const amountStr = parts[0];
  if (!amountStr) {
    await ctx.reply('Please provide an amount.');
    return;
  }

  const currency = parts[1]?.toUpperCase() || 'BDT';
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('Please enter a valid positive amount.');
    return;
  }

  // Optional: validate currency if needed (BDT, USD, INR...)
  const supportedCurrencies = ['BDT', 'USD', 'INR'];
  if (!supportedCurrencies.includes(currency)) {
    await ctx.reply(`Unsupported currency. Supported: ${supportedCurrencies.join(', ')}`);
    return;
  }

  try {
    const { pp_url, pp_id } = await createPipraPayPayment(dbUser.id, amount, currency);
    logger.info({ userId: dbUser.id, amount, currency, pp_id }, 'Deposit initiated');

    await ctx.reply(
      `✅ Deposit request created for ${currency} ${amount}.\n\n` +
      `Please complete payment using the link below:\n${pp_url}\n\n` +
      `Your balance will be updated automatically once the payment is confirmed.`
    );
  } catch (error: any) {
    logger.error(error, 'Deposit command error');
    await ctx.reply(`❌ Failed to initiate deposit: ${error.message}`);
  }
}