"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemExternalCode = redeemExternalCode;
const database_1 = require("../config/database");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const unipin_1 = require("./unipin");
const logger_1 = __importDefault(require("../logger"));
async function redeemExternalCode(userId, code, uid) {
    // Check if code already used
    const existing = await database_1.db.select().from(schema_1.usedCodes).where((0, drizzle_orm_1.eq)(schema_1.usedCodes.code, code)).limit(1);
    if (existing.length > 0) {
        return { success: false, message: 'This code has already been redeemed.' };
    }
    // Create an order record for tracking – only include necessary columns
    const [order] = await database_1.db.insert(schema_1.orders).values({
        userId,
        variationId: null,
        productNameSnapshot: 'External Code Redemption',
        variationTitleSnapshot: 'External Code',
        priceSnapshot: '0.00',
        uid: uid || null,
        quantity: 1,
        totalAmount: '0.00',
        paymentMethod: 'redeem',
        paymentStatus: 'paid',
        orderStatus: 'processing',
        orderNumber: `EXT-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).$returningId();
    if (!order?.id) {
        return { success: false, message: 'Failed to create order record.' };
    }
    // Attempt to redeem via UniPin if uid provided
    let redeemSuccess = true;
    let errorMessage = '';
    if (uid) {
        try {
            const unipinResult = await (0, unipin_1.callUnipinRedeem)(uid, code);
            if (!unipinResult.success) {
                redeemSuccess = false;
                errorMessage = unipinResult.message ?? 'Unknown error';
            }
        }
        catch (error) {
            logger_1.default.error(error, 'UniPin redeem error');
            redeemSuccess = false;
            errorMessage = error.message ?? 'Unknown error';
        }
    }
    else {
        // For codes that don't require UID, we just mark as used.
        redeemSuccess = true;
    }
    // Record the used code
    await database_1.db.insert(schema_1.usedCodes).values({
        code,
        userId,
        orderId: order.id,
        usedAt: new Date(),
    });
    // Update order status based on redemption result
    await database_1.db.update(schema_1.orders)
        .set({
        orderStatus: redeemSuccess ? 'completed' : 'cancelled',
        completedAt: redeemSuccess ? new Date() : null,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.orders.id, order.id));
    if (redeemSuccess) {
        return { success: true, message: 'Code redeemed successfully!', orderId: order.id };
    }
    else {
        return { success: false, message: `Code redemption failed: ${errorMessage}`, orderId: order.id };
    }
}
