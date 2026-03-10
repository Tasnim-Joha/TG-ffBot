"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refundPayment = refundPayment;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const piprapay_1 = require("../../../services/piprapay");
const logger_1 = __importDefault(require("../../../logger"));
async function refundPayment(ctx) {
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the pp_id.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1 || !args[0]) {
        await ctx.reply('Usage: /refund <pp_id>');
        return;
    }
    const pp_id = args[0];
    try {
        // Find deposit by gatewayRef (pp_id)
        const [deposit] = await database_1.db.select()
            .from(schema_1.deposits)
            .where((0, drizzle_orm_1.eq)(schema_1.deposits.gatewayRef, pp_id))
            .limit(1);
        if (!deposit) {
            return ctx.reply('Deposit not found.');
        }
        if (deposit.status !== 'completed') {
            return ctx.reply('Only completed deposits can be refunded.');
        }
        // Call PipraPay refund API
        const success = await (0, piprapay_1.refundPipraPayPayment)(pp_id);
        if (!success) {
            return ctx.reply('Refund failed at gateway.');
        }
        // Refund: deduct wallet balance (money returned to bank, so remove from wallet)
        await database_1.db.transaction(async (tx) => {
            // Lock user row
            const [user] = await tx.select({ balance: schema_1.users.balance })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, deposit.userId))
                .for('update');
            if (!user)
                throw new Error('User not found');
            const oldBalance = parseFloat(user.balance);
            const refundAmount = parseFloat(deposit.amount);
            const newBalance = oldBalance - refundAmount;
            if (newBalance < 0)
                throw new Error('Insufficient balance to refund');
            // Update user balance
            await tx.update(schema_1.users)
                .set({ balance: newBalance.toString() })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, deposit.userId));
            // Record transaction
            await tx.insert(schema_1.transactions).values({
                userId: deposit.userId,
                type: 'refund',
                amount: deposit.amount,
                balanceBefore: oldBalance.toString(),
                balanceAfter: newBalance.toString(),
                referenceType: 'deposit',
                referenceId: deposit.id,
                createdAt: new Date(),
            });
            // Mark deposit as refunded
            await tx.update(schema_1.deposits)
                .set({ status: 'refunded', updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.deposits.id, deposit.id));
        });
        logger_1.default.info({ admin: ctx.from?.id, pp_id }, 'Deposit refunded');
        await ctx.reply(`✅ Deposit ${pp_id} refunded.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Refund command error');
        await ctx.reply(`❌ Refund failed: ${error.message}`);
    }
}
