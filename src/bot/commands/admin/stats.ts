import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users, orders, deposits } from '../../../models/schema';
import { eq, and, sql } from 'drizzle-orm';
import logger from '../../../logger';

export async function botStats(ctx: Context) {
  try {
    // Total users
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const activeUsers = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isLoggedIn, 1));

    // Total orders and revenue
    const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const completedOrders = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.orderStatus, 'completed'));
    const totalRevenue = await db.select({ sum: sql<number>`sum(total_amount)` })
      .from(orders)
      .where(eq(orders.paymentStatus, 'paid'));

    // Deposits
    const pendingDeposits = await db.select({ count: sql<number>`count(*)` })
      .from(deposits)
      .where(eq(deposits.status, 'pending'));
    const totalDeposits = await db.select({ sum: sql<number>`sum(amount)` })
      .from(deposits)
      .where(eq(deposits.status, 'completed'));

    const message = `
📊 *Bot Statistics*

👥 *Users*
Total: ${totalUsers[0]?.count || 0}
Active: ${activeUsers[0]?.count || 0}

📦 *Orders*
Total: ${totalOrders[0]?.count || 0}
Completed: ${completedOrders[0]?.count || 0}
Revenue: ৳${totalRevenue[0]?.sum || 0}

💰 *Deposits*
Pending: ${pendingDeposits[0]?.count || 0}
Total Deposited: ৳${totalDeposits[0]?.sum || 0}
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'Stats command error');
    await ctx.reply('❌ Failed to fetch statistics.');
  }
}