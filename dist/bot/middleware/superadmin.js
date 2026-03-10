"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSuperAdmin = isSuperAdmin;
const database_1 = require("../../config/database");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function isSuperAdmin(telegramId) {
    if (!telegramId)
        return false;
    const user = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.telegramId, telegramId)).limit(1);
    if (user.length === 0)
        return false;
    const foundUser = user[0];
    if (!foundUser)
        return false;
    return foundUser.role === 'super_admin';
}
