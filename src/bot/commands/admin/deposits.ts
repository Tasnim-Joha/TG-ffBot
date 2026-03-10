import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { deposits, users } from '../../../models/schema';
import { eq } from 'drizzle-orm';

export async function listDeposits(ctx: Context): Promise<void> {
  const pending = await db.select({
    id: deposits.id,
    amount: deposits.amount,
    currency: deposits.currency,
    status: deposits.status,
    gatewayRef: deposits.gatewayRef,
    createdAt: deposits.createdAt,
    userTelegramId: users.telegramId,
    userName: users.name,
  })
  .from(deposits)
  .leftJoin(users, eq(deposits.userId, users.id))
  .where(eq(deposits.status, 'pending'))
  .orderBy(deposits.createdAt);

  if (pending.length === 0) {
    await ctx.reply('No pending deposits.');
    return;
  }

  let msg = '📋 Pending deposits:\n\n';
  pending.forEach((d, i) => {
    msg += `${i+1}. ID: ${d.id} | User: ${d.userName || d.userTelegramId} | Amount: ${d.currency} ${d.amount} | Created: ${d.createdAt.toLocaleString()}\n   PP ID: ${d.gatewayRef}\n\n`;
  });
  await ctx.reply(msg);
}