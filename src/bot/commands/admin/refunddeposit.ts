import { Context } from 'telegraf';
import { refundPipraPayPayment } from '../../../services/piprapay';
import { db } from '../../../config/database';
import { deposits, users, transactions } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import logger from '../../../logger';

export async function refundDeposit(ctx: Context): Promise<void> {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the PP ID.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0) {
    await ctx.reply('Usage: /refunddeposit <pp_id>');
    return;
  }

  const pp_id = args[0];
  if (!pp_id) {
    await ctx.reply('PP ID cannot be empty.');
    return;
  }

  try {
    const [deposit] = await db.select()
      .from(deposits)
      .where(eq(deposits.gatewayRef, pp_id))
      .limit(1);
    if (!deposit) {
      await ctx.reply('Deposit not found.');
      return;
    }

    if (deposit.status !== 'completed') {
      await ctx.reply('Only completed deposits can be refunded.');
      return;
    }

    const success = await refundPipraPayPayment(pp_id);
    if (!success) {
      await ctx.reply('Refund failed at gateway.');
      return;
    }

    await db.transaction(async (tx) => {
      const [user] = await tx.select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, deposit.userId))
        .for('update');
      if (!user) throw new Error('User not found');

      const oldBalance = parseFloat(user.balance);
      const refundAmount = parseFloat(deposit.amount);
      const newBalance = oldBalance - refundAmount;
      if (newBalance < 0) throw new Error('Insufficient balance to refund');

      await tx.update(users)
        .set({ balance: newBalance.toString() })
        .where(eq(users.id, deposit.userId));

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

      await tx.update(deposits)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(deposits.id, deposit.id));
    });

    logger.info({ admin: ctx.from?.id, pp_id }, 'Deposit refunded');
    await ctx.reply(`✅ Deposit ${pp_id} refunded successfully.`);
  } catch (error: any) {
    logger.error(error, 'Refund deposit error');
    await ctx.reply(`❌ Refund failed: ${error.message}`);
  }
}