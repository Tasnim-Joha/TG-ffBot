import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { orders } from '../../../models/schema';
import { eq, desc } from 'drizzle-orm';
import logger from '../../../logger';

export async function ordersCommand(ctx: Context) {
  const dbUser = (ctx as any).dbUser;
  if (!dbUser) {
    await ctx.reply('You need to be logged in to view your orders.');
    return;
  }

  try {
    const userOrders = await db.select()
      .from(orders)
      .where(eq(orders.userId, dbUser.id))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    if (userOrders.length === 0) {
      await ctx.reply('You have no orders yet.');
      return;
    }

    let message = '📦 *Your Recent Orders*\n\n';
    for (const order of userOrders) {
      const statusEmoji = order.orderStatus === 'completed' ? '✅' :
                          order.orderStatus === 'processing' ? '⏳' :
                          order.orderStatus === 'cancelled' ? '❌' : '⏸️';
      message += `${statusEmoji} *Order #${order.id}*\n`;
      message += `Product: ${order.productNameSnapshot}\n`;
      message += `Amount: ৳${order.totalAmount}\n`;
      message += `Status: ${order.orderStatus}\n`;
      if (order.uid) message += `UID: \`${order.uid}\`\n`;
      message += `Date: ${order.createdAt.toLocaleString()}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'Orders command error');
    await ctx.reply('Failed to fetch orders. Please try again later.');
  }
}