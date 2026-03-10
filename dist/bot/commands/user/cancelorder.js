"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrderCommand = cancelOrderCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
async function cancelOrderCommand(ctx) {
    const dbUser = ctx.dbUser;
    if (!dbUser) {
        await ctx.reply('You need to be logged in to cancel an order.');
        return;
    }
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the order ID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1 || !args[0]) {
        await ctx.reply('Usage: /cancelorder <order_id>');
        return;
    }
    const orderId = parseInt(args[0]);
    if (isNaN(orderId)) {
        await ctx.reply('Invalid order ID.');
        return;
    }
    try {
        let refundMessage = '';
        await database_1.db.transaction(async (tx) => {
            // Get the full order
            const [order] = await tx.select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.userId, dbUser.id)))
                .limit(1);
            if (!order) {
                throw new Error('Order not found or does not belong to you.');
            }
            // Use type assertion to access paymentMethod and paymentStatus
            const orderAny = order;
            if (orderAny.orderStatus !== 'pending') {
                throw new Error('Only pending orders can be cancelled.');
            }
            // Update order status to cancelled
            await tx.update(schema_1.orders)
                .set({ orderStatus: 'cancelled', cancelledAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId));
            // If the order was paid via wallet, refund the amount
            if (orderAny.paymentMethod === 'wallet' && orderAny.paymentStatus === 'paid') {
                // Lock the user's balance row
                const [user] = await tx.select({ balance: schema_1.users.balance })
                    .from(schema_1.users)
                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, dbUser.id))
                    .for('update');
                if (!user)
                    throw new Error('User not found');
                const oldBalance = parseFloat(user.balance);
                const refundAmount = parseFloat(orderAny.totalAmount);
                const newBalance = oldBalance + refundAmount;
                // Update user balance
                await tx.update(schema_1.users)
                    .set({ balance: newBalance.toString() })
                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, dbUser.id));
                // Create transaction record for the refund
                await tx.insert(schema_1.transactions).values({
                    userId: dbUser.id,
                    type: 'refund',
                    amount: refundAmount.toString(),
                    balanceBefore: oldBalance.toString(),
                    balanceAfter: newBalance.toString(),
                    referenceType: 'order',
                    referenceId: orderId,
                    createdAt: new Date(),
                });
                refundMessage = `\n💵 Refund of ৳${refundAmount.toFixed(2)} has been credited to your wallet.`;
            }
        });
        await ctx.reply(`✅ Order #${orderId} has been cancelled.${refundMessage}`);
    }
    catch (error) {
        logger_1.default.error(error, 'Cancel order error');
        await ctx.reply(`❌ Failed to cancel order: ${error.message}`);
    }
}
