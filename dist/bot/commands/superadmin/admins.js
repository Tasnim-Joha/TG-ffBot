"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAdmin = addAdmin;
exports.removeAdmin = removeAdmin;
exports.listAdmins = listAdmins;
exports.setSuperAdmin = setSuperAdmin;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const settings_1 = require("../../../config/settings");
const logger_1 = __importDefault(require("../../../logger"));
function safeParseInt(value) {
    if (!value)
        return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
}
// /addadmin <user_id> – promote a user to admin (adds to admin_ids and sets role to admin)
async function addAdmin(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the user ID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1) {
        await ctx.reply('Usage: /addadmin <user_id>');
        return;
    }
    const userId = safeParseInt(args[0]);
    if (!userId) {
        await ctx.reply('Invalid user ID.');
        return;
    }
    try {
        const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (!user) {
            await ctx.reply('User not found.');
            return;
        }
        // Update role to admin
        await database_1.db.update(schema_1.users)
            .set({ role: 'admin' })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        // Also add to admin_ids setting
        const adminIds = settings_1.settings.get('admin_ids', []);
        if (!adminIds.includes(user.telegramId)) {
            adminIds.push(user.telegramId);
            await settings_1.settings.set('admin_ids', adminIds);
        }
        logger_1.default.info({ superadmin: ctx.from?.id, targetUserId: userId }, 'User promoted to admin');
        await ctx.reply(`✅ User ${userId} (${user.name}) is now an admin.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Add admin error');
        await ctx.reply('❌ Failed to promote user.');
    }
}
// /removeadmin <user_id> – demote admin to user
async function removeAdmin(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the user ID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1) {
        await ctx.reply('Usage: /removeadmin <user_id>');
        return;
    }
    const userId = safeParseInt(args[0]);
    if (!userId) {
        await ctx.reply('Invalid user ID.');
        return;
    }
    try {
        const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (!user) {
            await ctx.reply('User not found.');
            return;
        }
        if (user.role === 'super_admin') {
            await ctx.reply('Cannot demote a super admin. Use /setsuperadmin first.');
            return;
        }
        await database_1.db.update(schema_1.users)
            .set({ role: 'user' })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        const adminIds = settings_1.settings.get('admin_ids', []);
        const filtered = adminIds.filter(id => id !== user.telegramId);
        await settings_1.settings.set('admin_ids', filtered);
        logger_1.default.info({ superadmin: ctx.from?.id, targetUserId: userId }, 'Admin demoted to user');
        await ctx.reply(`✅ User ${userId} is now a regular user.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Remove admin error');
        await ctx.reply('❌ Failed to demote user.');
    }
}
// /listadmins – list all admins and superadmins
async function listAdmins(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message.');
        return;
    }
    try {
        const admins = await database_1.db.select({
            id: schema_1.users.id,
            telegramId: schema_1.users.telegramId,
            name: schema_1.users.name,
            email: schema_1.users.email,
            role: schema_1.users.role,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.role, 'admin'));
        const superAdmins = await database_1.db.select({
            id: schema_1.users.id,
            telegramId: schema_1.users.telegramId,
            name: schema_1.users.name,
            email: schema_1.users.email,
            role: schema_1.users.role,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.role, 'super_admin'));
        let message = '👑 *Admin List*\n\n';
        if (superAdmins.length > 0) {
            message += '*Super Admins:*\n';
            for (const sa of superAdmins) {
                message += `- ID ${sa.id}: ${sa.name || 'N/A'} (${sa.email || 'No email'})\n`;
            }
            message += '\n';
        }
        if (admins.length > 0) {
            message += '*Admins:*\n';
            for (const a of admins) {
                message += `- ID ${a.id}: ${a.name || 'N/A'} (${a.email || 'No email'})\n`;
            }
        }
        else {
            message += 'No admins found.';
        }
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.error(error, 'List admins error');
        await ctx.reply('❌ Failed to list admins.');
    }
}
// /setsuperadmin <user_id> – grant super admin role
async function setSuperAdmin(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the user ID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1) {
        await ctx.reply('Usage: /setsuperadmin <user_id>');
        return;
    }
    const userId = safeParseInt(args[0]);
    if (!userId) {
        await ctx.reply('Invalid user ID.');
        return;
    }
    try {
        const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (!user) {
            await ctx.reply('User not found.');
            return;
        }
        await database_1.db.update(schema_1.users)
            .set({ role: 'super_admin' })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        const adminIds = settings_1.settings.get('admin_ids', []);
        if (!adminIds.includes(user.telegramId)) {
            adminIds.push(user.telegramId);
            await settings_1.settings.set('admin_ids', adminIds);
        }
        logger_1.default.info({ superadmin: ctx.from?.id, targetUserId: userId }, 'User promoted to superadmin');
        await ctx.reply(`✅ User ${userId} is now a super admin.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Set superadmin error');
        await ctx.reply('❌ Failed to set super admin.');
    }
}
