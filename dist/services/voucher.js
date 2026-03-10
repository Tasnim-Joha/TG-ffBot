"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignVoucher = assignVoucher;
const database_1 = require("../config/database");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function assignVoucher(variationId, orderId) {
    // Find an unused voucher for this variation
    const [voucher] = await database_1.db.select()
        .from(schema_1.vouchers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vouchers.variationId, variationId), (0, drizzle_orm_1.eq)(schema_1.vouchers.isUsed, 0), (0, drizzle_orm_1.isNull)(schema_1.vouchers.orderId)))
        .limit(1);
    if (!voucher)
        return null;
    // Mark as used
    await database_1.db.update(schema_1.vouchers)
        .set({ isUsed: 1, orderId, usedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.vouchers.id, voucher.id));
    return voucher.code;
}
