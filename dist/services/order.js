"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderNumber = generateOrderNumber;
exports.createOrder = createOrder;
exports.processWalletOrder = processWalletOrder;
const database_1 = require("../config/database");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
async function generateOrderNumber() {
    const prefix = 'FF';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = (0, crypto_1.randomInt)(1000, 9999).toString();
    const orderNumber = `${prefix}${timestamp}${random}`;
    return orderNumber;
}
async function createOrder(data) {
    const orderNumber = await generateOrderNumber();
    const [order] = await database_1.db.insert(schema_1.orders).values({
        userId: data.userId,
        variationId: data.variationId,
        productNameSnapshot: data.productName,
        variationTitleSnapshot: data.variationTitle,
        priceSnapshot: data.price.toString(),
        uid: data.uid,
        quantity: data.quantity,
        totalAmount: data.totalAmount.toString(),
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentMethod === 'wallet' ? 'paid' : 'pending',
        orderStatus: data.paymentMethod === 'wallet' ? 'processing' : 'pending',
        orderNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).$returningId();
    if (!order?.id)
        throw new Error('Failed to create order');
    return { ...data, id: order.id, orderNumber };
}
async function processWalletOrder(userId, orderId, totalAmount) {
    await database_1.db.transaction(async (tx) => {
        // Lock user row
        const [user] = await tx.select({ balance: schema_1.users.balance })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .for('update');
        if (!user)
            throw new Error('User not found');
        const balance = parseFloat(user.balance);
        if (balance < totalAmount)
            throw new Error('Insufficient balance');
        const newBalance = balance - totalAmount;
        // Update balance
        await tx.update(schema_1.users)
            .set({ balance: newBalance.toString() })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        // Record transaction – removed 'remark' field to match schema
        await tx.insert(schema_1.transactions).values({
            userId,
            type: 'debit',
            amount: totalAmount.toString(),
            balanceBefore: balance.toString(),
            balanceAfter: newBalance.toString(),
            referenceType: 'order',
            referenceId: orderId,
            createdAt: new Date(),
        });
        // Update order payment status
        await tx.update(schema_1.orders)
            .set({ paymentStatus: 'paid', orderStatus: 'processing' })
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId));
    });
}
