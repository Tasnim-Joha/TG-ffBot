"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrders = listOrders;
exports.viewOrder = viewOrder;
exports.approveOrder = approveOrder;
exports.cancelOrder = cancelOrder;
exports.refundOrder = refundOrder;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
function safeParseInt(value) {
    if (!value)
        return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
}
// /orders – list all orders with filters (status, page)
async function listOrders(ctx) {
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
                whereConditions.push((0, drizzle_orm_1.eq)(schema_1.orders.orderStatus, validStatus));
            }
        }
        const whereClause = whereConditions.length ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
        const orderList = await database_1.db.select()
            .from(schema_1.orders)
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
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
    }
    catch (error) {
        logger_1.default.error(error, 'List orders error');
        await ctx.reply('❌ Failed to fetch orders.');
    }
}
// /order <id> – view detailed order info
async function viewOrder(ctx) {
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
        const [order] = await database_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, id)).limit(1);
        if (!order) {
            await ctx.reply('Order not found.');
            return;
        }
        const user = await database_1.db.select({ name: schema_1.users.name }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, order.userId)).limit(1);
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
    }
    catch (error) {
        logger_1.default.error(error, 'View order error');
        await ctx.reply('❌ Failed to fetch order details.');
    }
}
// /approveorder <id> – mark an order as completed (for manual delivery)
async function approveOrder(ctx) {
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
        const [order] = await database_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, id)).limit(1);
        if (!order) {
            await ctx.reply('Order not found.');
            return;
        }
        if (order.orderStatus === 'completed') {
            await ctx.reply('Order is already completed.');
            return;
        }
        await database_1.db.update(schema_1.orders)
            .set({ orderStatus: 'completed', completedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id));
        logger_1.default.info({ admin: ctx.from?.id, orderId: id }, 'Order approved');
        await ctx.reply(`✅ Order #${id} marked as completed.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Approve order error');
        await ctx.reply('❌ Failed to approve order.');
    }
}
// /cancelorder <id> – cancel an order and optionally refund
async function cancelOrder(ctx) {
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
        const [order] = await database_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, id)).limit(1);
        if (!order) {
            await ctx.reply('Order not found.');
            return;
        }
        if (order.orderStatus === 'cancelled') {
            await ctx.reply('Order is already cancelled.');
            return;
        }
        await database_1.db.transaction(async (tx) => {
            // Update order status to cancelled
            await tx.update(schema_1.orders)
                .set({ orderStatus: 'cancelled', cancelledAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id));
            // Refund if requested and order was paid via wallet
            if (refund && order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
                const [user] = await tx.select({ balance: schema_1.users.balance })
                    .from(schema_1.users)
                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, order.userId))
                    .for('update');
                if (!user)
                    throw new Error('User not found');
                const oldBalance = parseFloat(user.balance);
                const refundAmount = parseFloat(order.totalAmount);
                const newBalance = oldBalance + refundAmount;
                await tx.update(schema_1.users)
                    .set({ balance: newBalance.toString() })
                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, order.userId));
                await tx.insert(schema_1.transactions).values({
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
        logger_1.default.info({ admin: ctx.from?.id, orderId: id, refund }, 'Order cancelled');
        await ctx.reply(`✅ Order #${id} cancelled.${refund ? ' Refund processed.' : ''}`);
    }
    catch (error) {
        logger_1.default.error(error, 'Cancel order error');
        await ctx.reply('❌ Failed to cancel order.');
    }
}
// /refund <id> – refund an order (wallet payment)
async function refundOrder(ctx) {
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
        const [order] = await database_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, id)).limit(1);
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
        await database_1.db.transaction(async (tx) => {
            const [user] = await tx.select({ balance: schema_1.users.balance })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, order.userId))
                .for('update');
            if (!user)
                throw new Error('User not found');
            const oldBalance = parseFloat(user.balance);
            const refundAmount = parseFloat(order.totalAmount);
            const newBalance = oldBalance + refundAmount;
            await tx.update(schema_1.users)
                .set({ balance: newBalance.toString() })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, order.userId));
            await tx.insert(schema_1.transactions).values({
                userId: order.userId,
                type: 'refund',
                amount: refundAmount.toString(),
                balanceBefore: oldBalance.toString(),
                balanceAfter: newBalance.toString(),
                referenceType: 'order',
                referenceId: id,
                createdAt: new Date(),
            });
            await tx.update(schema_1.orders)
                .set({ orderStatus: 'cancelled', paymentStatus: 'refunded', updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id));
        });
        logger_1.default.info({ admin: ctx.from?.id, orderId: id }, 'Order refunded');
        await ctx.reply(`✅ Order #${id} refunded.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Refund order error');
        await ctx.reply('❌ Failed to refund order.');
    }
}
