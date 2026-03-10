"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDeposit = verifyDeposit;
const piprapay_1 = require("../../../services/piprapay");
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function verifyDeposit(ctx) {
    const args = ctx.message?.text.split(' ').slice(1);
    if (!args || args.length === 0) {
        await ctx.reply('Usage: /verifydeposit <pp_id>');
        return;
    }
    const pp_id = args[0];
    try {
        const data = await (0, piprapay_1.verifyPipraPayPayment)(pp_id);
        // Find deposit by gatewayRef
        const [deposit] = await database_1.db.select().from(schema_1.deposits).where((0, drizzle_orm_1.eq)(schema_1.deposits.gatewayRef, pp_id)).limit(1);
        if (!deposit) {
            await ctx.reply('Deposit record not found for this PP ID.');
            return;
        }
        if (data.status === 'completed' && deposit.status !== 'completed') {
            await (0, piprapay_1.completeDeposit)(deposit.id, deposit.userId, parseFloat(deposit.amount));
            await ctx.reply('✅ Deposit verified and completed.');
        }
        else {
            await ctx.reply(`Payment status: ${data.status}. No action taken.`);
        }
    }
    catch (error) {
        await ctx.reply(`❌ Verification failed: ${error.message}`);
    }
}
