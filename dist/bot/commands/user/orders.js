"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersCommand = ordersCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
async function ordersCommand(ctx) {
    const dbUser = ctx.dbUser;
    if (!dbUser) {
        await ctx.reply('You need to be logged in to view your orders.');
        return;
    }
    try {
        const userOrders = await database_1.db.select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.eq)(schema_1.orders.userId, dbUser.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
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
            if (order.uid)
                message += `UID: \`${order.uid}\`\n`;
            message += `Date: ${order.createdAt.toLocaleString()}\n\n`;
        }
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.error(error, 'Orders command error');
        await ctx.reply('Failed to fetch orders. Please try again later.');
    }
}
