import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { orders, users, transactions } from '../../../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import logger from '../../../logger';

function safeParseInt(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

// /orders – list all orders with filters (status, page)
export async function listOrders(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  const status = args[0] || null; // optional status filter
  const page = args[1] ? parseInt(args[1]) : 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const whereConditions = [];
    if (status) {
      const validStatus = ['pending', 'processing', 'completed', 'cancelled'].includes(status) ? status : null;
      if (validStatus) {
        whereConditions.push(eq(orders.orderStatus, validStatus as any));
      }
    }
    const whereClause = whereConditions.length ? and(...whereConditions) : undefined;

    const orderList = await db.select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    if (orderList.length === 0) {
      await ctx.reply('No orders found.');
      return;
    }

    let message = `📋 Orders (Page ${page}):\n\n`;
    for (const o of orderList) {
      message += `*Order #${o.id}* | ${o.orderNumber}\n`;
      message += `User: ${o.userId} | Status: ${o.orderStatus}\n`;
      message += `Amount: ৳${o.totalAmount} | Date: ${o.createdAt.toLocaleString()}\n\n`;
    }
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'List orders error');
    await ctx.reply('❌ Failed to fetch orders.');
  }
}

// /order <id> – view detailed order info
export async function viewOrder(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the order ID.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1) {
    await ctx.reply('Usage: /order <order_id>');
    return;
  }
  const id = safeParseInt(args[0]);
  if (!id) {
    await ctx.reply('Invalid order ID.');
    return;
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      await ctx.reply('Order not found.');
      return;
    }

    const user = await db.select({ name: users.name }).from(users).where(eq(users.id, order.userId)).limit(1);
    const userName = user[0]?.name || 'Unknown';

    const message = `
📦 *Order Details*
ID: \`${order.id}\`
Number: ${order.orderNumber}
User: ${userName} (ID: ${order.userId})
Product: ${order.productNameSnapshot}
Variation: ${order.variationTitleSnapshot}
Price: ৳${order.priceSnapshot}
Quantity: ${order.quantity}
Total: ৳${order.totalAmount}
Payment Method: ${order.paymentMethod}
Payment Status: ${order.paymentStatus}
Order Status: ${order.orderStatus}
UID: ${order.uid || 'N/A'}
Created: ${order.createdAt.toLocaleString()}
${order.completedAt ? `Completed: ${order.completedAt.toLocaleString()}` : ''}
${order.cancelledAt ? `Cancelled: ${order.cancelledAt.toLocaleString()}` : ''}
    `;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'View order error');
    await ctx.reply('❌ Failed to fetch order details.');
  }
}

// /approveorder <id> – mark an order as completed (for manual delivery)
export async function approveOrder(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the order ID.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1) {
    await ctx.reply('Usage: /approveorder <order_id>');
    return;
  }
  const id = safeParseInt(args[0]);
  if (!id) {
    await ctx.reply('Invalid order ID.');
    return;
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      await ctx.reply('Order not found.');
      return;
    }

    if (order.orderStatus === 'completed') {
      await ctx.reply('Order is already completed.');
      return;
    }

    await db.update(orders)
      .set({ orderStatus: 'completed', completedAt: new Date() })
      .where(eq(orders.id, id));

    logger.info({ admin: ctx.from?.id, orderId: id }, 'Order approved');
    await ctx.reply(`✅ Order #${id} marked as completed.`);
  } catch (error) {
    logger.error(error, 'Approve order error');
    await ctx.reply('❌ Failed to approve order.');
  }
}

// /cancelorder <id> – cancel an order and optionally refund
export async function cancelOrder(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the order ID.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length < 1) {
    await ctx.reply('Usage: /cancelorder <order_id> [refund: yes/no]');
    return;
  }
  const id = safeParseInt(args[0]);
  if (!id) {
    await ctx.reply('Invalid order ID.');
    return;
  }
  const refund = args[1]?.toLowerCase() === 'yes' || args[1]?.toLowerCase() === 'y';

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      await ctx.reply('Order not found.');
      return;
    }

    if (order.orderStatus === 'cancelled') {
      await ctx.reply('Order is already cancelled.');
      return;
    }

    await db.transaction(async (tx) => {
      // Update order status to cancelled
      await tx.update(orders)
        .set({ orderStatus: 'cancelled', cancelledAt: new Date() })
        .where(eq(orders.id, id));

      // Refund if requested and order was paid via wallet
      if (refund && order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
        const [user] = await tx.select({ balance: users.balance })
          .from(users)
          .where(eq(users.id, order.userId))
          .for('update');

        if (!user) throw new Error('User not found');

        const oldBalance = parseFloat(user.balance);
        const refundAmount = parseFloat(order.totalAmount);
        const newBalance = oldBalance + refundAmount;

        await tx.update(users)
          .set({ balance: newBalance.toString() })
          .where(eq(users.id, order.userId));

        await tx.insert(transactions).values({
          userId: order.userId,
          type: 'refund',
          amount: refundAmount.toString(),
          balanceBefore: oldBalance.toString(),
          balanceAfter: newBalance.toString(),
          referenceType: 'order',
          referenceId: id,
          createdAt: new Date(),
        });
      }
    });

    logger.info({ admin: ctx.from?.id, orderId: id, refund }, 'Order cancelled');
    await ctx.reply(`✅ Order #${id} cancelled.${refund ? ' Refund processed.' : ''}`);
  } catch (error) {
    logger.error(error, 'Cancel order error');
    await ctx.reply('❌ Failed to cancel order.');
  }
}

// /refund <id> – refund an order (wallet payment)
export async function refundOrder(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the order ID.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1) {
    await ctx.reply('Usage: /refund <order_id>');
    return;
  }
  const id = safeParseInt(args[0]);
  if (!id) {
    await ctx.reply('Invalid order ID.');
    return;
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      await ctx.reply('Order not found.');
      return;
    }

    // Check if already refunded
    if (order.paymentStatus === 'refunded') {
      await ctx.reply('Order already refunded.');
      return;
    }

    if (order.paymentMethod !== 'wallet' || order.paymentStatus !== 'paid') {
      await ctx.reply('Only paid wallet orders can be refunded.');
      return;
    }

    await db.transaction(async (tx) => {
      const [user] = await tx.select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, order.userId))
        .for('update');

      if (!user) throw new Error('User not found');

      const oldBalance = parseFloat(user.balance);
      const refundAmount = parseFloat(order.totalAmount);
      const newBalance = oldBalance + refundAmount;

      await tx.update(users)
        .set({ balance: newBalance.toString() })
        .where(eq(users.id, order.userId));

      await tx.insert(transactions).values({
        userId: order.userId,
        type: 'refund',
        amount: refundAmount.toString(),
        balanceBefore: oldBalance.toString(),
        balanceAfter: newBalance.toString(),
        referenceType: 'order',
        referenceId: id,
        createdAt: new Date(),
      });

      await tx.update(orders)
        .set({ orderStatus: 'cancelled', paymentStatus: 'refunded', updatedAt: new Date() })
        .where(eq(orders.id, id));
    });

    logger.info({ admin: ctx.from?.id, orderId: id }, 'Order refunded');
    await ctx.reply(`✅ Order #${id} refunded.`);
  } catch (error) {
    logger.error(error, 'Refund order error');
    await ctx.reply('❌ Failed to refund order.');
  }
}