import { Context } from 'telegraf';
import { verifyPipraPayPayment, completeDeposit } from '../../../services/piprapay';
import { db } from '../../../config/database';
import { deposits } from '../../../models/schema';
import { eq } from 'drizzle-orm';

export async function verifyDeposit(ctx: Context): Promise<void> {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the PP ID.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0) {
    await ctx.reply('Usage: /verifydeposit <pp_id>');
    return;
  }

  const pp_id = args[0];
  if (!pp_id) {
    await ctx.reply('PP ID cannot be empty.');
    return;
  }

  try {
    const data = await verifyPipraPayPayment(pp_id);
    const [deposit] = await db.select()
      .from(deposits)
      .where(eq(deposits.gatewayRef, pp_id))
      .limit(1);

    if (!deposit) {
      await ctx.reply('Deposit record not found for this PP ID.');
      return;
    }

    if (data.status === 'completed' && deposit.status !== 'completed') {
      await completeDeposit(deposit.id, deposit.userId, parseFloat(deposit.amount));
      await ctx.reply('✅ Deposit verified and completed.');
    } else {
      await ctx.reply(`Payment status: ${data.status}. No action taken.`);
    }
  } catch (error: any) {
    await ctx.reply(`❌ Verification failed: ${error.message}`);
  }
}