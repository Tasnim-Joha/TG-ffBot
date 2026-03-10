"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBalance = getUserBalance;
exports.updateUserBalance = updateUserBalance;
exports.createTransaction = createTransaction;
const database_1 = require("../config/database");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function getUserBalance(userId) {
    const [result] = await database_1.db.select({ balance: schema_1.users.balance })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    return result ? parseFloat(result.balance) : 0;
}
async function updateUserBalance(userId, newBalance) {
    await database_1.db.update(schema_1.users)
        .set({ balance: newBalance.toString(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
}
async function createTransaction(data) {
    await database_1.db.insert(schema_1.transactions).values({
        userId: data.userId,
        type: data.type,
        amount: data.amount.toString(),
        balanceBefore: data.balanceBefore.toString(),
        balanceAfter: data.balanceAfter.toString(),
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        createdAt: new Date(),
    });
}
