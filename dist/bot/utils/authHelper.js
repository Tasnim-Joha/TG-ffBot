"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const database_1 = require("../../config/database");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function requireAuth(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.reply('Unable to identify you. Please /start again.');
        return false;
    }
    const user = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.telegramId, telegramId)).limit(1);
    if (user.length === 0) {
        await ctx.reply('You are not registered. Please use /register first.');
        return false;
    }
    const dbUser = user[0];
    if (!dbUser) {
        await ctx.reply('Error retrieving user data.');
        return false;
    }
    if (!dbUser.isLoggedIn) {
        await ctx.reply('You are not logged in. Please use /login.');
        return false;
    }
    // Check session expiry
    if (dbUser.sessionExpiresAt && new Date(dbUser.sessionExpiresAt) < new Date()) {
        // Session expired – automatically log out
        await database_1.db.update(schema_1.users)
            .set({ isLoggedIn: 0, sessionExpiresAt: null })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, dbUser.id));
        await ctx.reply('Your session has expired. Please log in again with /login.');
        return false;
    }
    // Attach user to context for later use in command handlers
    ctx.dbUser = dbUser;
    return true;
}
