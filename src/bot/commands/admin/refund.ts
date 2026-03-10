import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { deposits, users, transactions } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import { refundPipraPayPayment } from '../../../services/piprapay';
import logger from '../../../logger';

export async function refundPayment(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the pp_id.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1 || !args[0]) {
    await ctx.reply('Usage: /refund <pp_id>');
    return;
  }

  const pp_id = args[0];

  try {
    // Find deposit by gatewayRef (pp_id)
    const [deposit] = await db.select()
      .from(deposits)
      .where(eq(deposits.gatewayRef, pp_id))
      .limit(1);
    if (!deposit) {
      return ctx.reply('Deposit not found.');
    }

    if (deposit.status !== 'completed') {
      return ctx.reply('Only completed deposits can be refunded.');
    }

    // Call PipraPay refund API
    const success = await refundPipraPayPayment(pp_id);
    if (!success) {
      return ctx.reply('Refund failed at gateway.');
    }

    // Refund: deduct wallet balance (money returned to bank, so remove from wallet)
    await db.transaction(async (tx) => {
      // Lock user row
      const [user] = await tx.select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, deposit.userId))
        .for('update');
      if (!user) throw new Error('User not found');

      const oldBalance = parseFloat(user.balance);
      const refundAmount = parseFloat(deposit.amount);
      const newBalance = oldBalance - refundAmount;
      if (newBalance < 0) throw new Error('Insufficient balance to refund');

      // Update user balance
      await tx.update(users)
        .set({ balance: newBalance.toString() })
        .where(eq(users.id, deposit.userId));

      // Record transaction
      await tx.insert(transactions).values({
        userId: deposit.userId,
        type: 'refund',
        amount: deposit.amount,
        balanceBefore: oldBalance.toString(),
        balanceAfter: newBalance.toString(),
        referenceType: 'deposit',
        referenceId: deposit.id,
        createdAt: new Date(),
      });

      // Mark deposit as refunded
      await tx.update(deposits)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(deposits.id, deposit.id));
    });

    logger.info({ admin: ctx.from?.id, pp_id }, 'Deposit refunded');
    await ctx.reply(`✅ Deposit ${pp_id} refunded.`);
  } catch (error: any) {
    logger.error(error, 'Refund command error');
    await ctx.reply(`❌ Refund failed: ${error.message}`);
  }
}