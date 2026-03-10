import { Context } from 'telegraf';
import { redeemExternalCode } from '../../../services/redeem';
import logger from '../../../logger';

export async function redeemCommand(ctx: Context) {
  const dbUser = (ctx as any).dbUser;
  if (!dbUser) {
    await ctx.reply('You need to be logged in to redeem a code.');
    return;
  }

  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the code.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1 || !args[0]) {
    await ctx.reply('Usage: /redeem <code> [uid]');
    return;
  }

  const code = args[0];
  const uid = args[1]; // optional

  try {
    const result = await redeemExternalCode(dbUser.id, code, uid);
    if (result.success) {
      await ctx.reply(`✅ ${result.message} (Order ID: ${result.orderId})`);
    } else {
      await ctx.reply(`❌ ${result.message}`);
    }
  } catch (error: any) {
    logger.error(error, 'Redeem command error');
    await ctx.reply(`❌ Redemption failed: ${error.message}`);
  }
}