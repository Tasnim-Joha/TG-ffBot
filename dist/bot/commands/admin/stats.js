"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botStats = botStats;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
async function botStats(ctx) {
    try {
        // Total users
        const totalUsers = await database_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.users);
        const activeUsers = await database_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.isLoggedIn, 1));
        // Total orders and revenue
        const totalOrders = await database_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.orders);
        const completedOrders = await database_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.eq)(schema_1.orders.orderStatus, 'completed'));
        const totalRevenue = await database_1.db.select({ sum: (0, drizzle_orm_1.sql) `sum(total_amount)` })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.eq)(schema_1.orders.paymentStatus, 'paid'));
        // Deposits
        const pendingDeposits = await database_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.deposits)
            .where((0, drizzle_orm_1.eq)(schema_1.deposits.status, 'pending'));
        const totalDeposits = await database_1.db.select({ sum: (0, drizzle_orm_1.sql) `sum(amount)` })
            .from(schema_1.deposits)
            .where((0, drizzle_orm_1.eq)(schema_1.deposits.status, 'completed'));
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
    }
    catch (error) {
        logger_1.default.error(error, 'Stats command error');
        await ctx.reply('❌ Failed to fetch statistics.');
    }
}
