"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDeposits = listDeposits;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function listDeposits(ctx) {
    const pending = await database_1.db.select({
        id: schema_1.deposits.id,
        amount: schema_1.deposits.amount,
        currency: schema_1.deposits.currency,
        status: schema_1.deposits.status,
        gatewayRef: schema_1.deposits.gatewayRef,
        createdAt: schema_1.deposits.createdAt,
        userTelegramId: schema_1.users.telegramId,
        userName: schema_1.users.name,
    })
        .from(schema_1.deposits)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.deposits.userId, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.deposits.status, 'pending'))
        .orderBy(schema_1.deposits.createdAt);
    if (pending.length === 0) {
        await ctx.reply('No pending deposits.');
        return;
    }
    let msg = '📋 Pending deposits:\n\n';
    pending.forEach((d, i) => {
        msg += `${i + 1}. ID: ${d.id} | User: ${d.userName || d.userTelegramId} | Amount: ${d.currency} ${d.amount} | Created: ${d.createdAt.toLocaleString()}\n   PP ID: ${d.gatewayRef}\n\n`;
    });
    await ctx.reply(msg);
}
