"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.userInfo = userInfo;
exports.banUser = banUser;
exports.unbanUser = unbanUser;
exports.addBalance = addBalance;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const otp_1 = require("../../../services/otp");
const logger_1 = __importDefault(require("../../../logger"));
function safeParseInt(value) {
    if (!value)
        return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
}
// /users [page] – list all users with pagination
async function listUsers(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    const page = args[0] ? parseInt(args[0]) : 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    try {
        const userList = await database_1.db.select({
            id: schema_1.users.id,
            telegramId: schema_1.users.telegramId,
            name: schema_1.users.name,
            email: schema_1.users.email,
            balance: schema_1.users.balance,
            role: schema_1.users.role,
            isLoggedIn: schema_1.users.isLoggedIn,
            status: schema_1.users.status, // Cast to any to avoid missing property error
            createdAt: schema_1.users.createdAt,
        })
            .from(schema_1.users)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))
            .limit(limit)
            .offset(offset);
        const totalCount = await database_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.users);
        const totalPages = Math.ceil(totalCount[0].count / limit);
        if (userList.length === 0) {
            await ctx.reply('No users found.');
            return;
        }
        let message = `👥 Users (Page ${page}/${totalPages}):\n\n`;
        for (const u of userList) {
            const statusIcon = u.isLoggedIn ? '🟢' : '🔴';
            message += `${statusIcon} *ID ${u.id}* | ${u.name || 'No name'}\n`;
            message += `TG: \`${u.telegramId}\` | Email: ${u.email || 'Not set'}\n`;
            message += `Balance: ৳${u.balance} | Role: ${u.role} | Status: ${u.status || 'active'}\n`;
            message += `Registered: ${u.createdAt?.toLocaleDateString()}\n\n`;
        }
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.error(error, 'List users error');
        await ctx.reply('❌ Failed to fetch users.');
    }
}
// /userinfo <user_id> – view detailed user info
async function userInfo(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the user ID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1) {
        await ctx.reply('Usage: /userinfo <user_id>');
        return;
    }
    const id = safeParseInt(args[0]);
    if (!id) {
        await ctx.reply('Invalid user ID.');
        return;
    }
    try {
        const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
        if (!user) {
            await ctx.reply('User not found.');
            return;
        }
        const userAny = user; // Cast to access status if needed
        const status = userAny.status || 'active';
        const message = `
👤 *User Details*
ID: \`${user.id}\`
Telegram ID: \`${user.telegramId}\`
Name: ${user.name || 'N/A'}
Email: ${user.email || 'N/A'}
Balance: ৳${user.balance}
Role: ${user.role}
Status: ${status}
Logged In: ${user.isLoggedIn ? 'Yes' : 'No'}
Last Activity: ${user.lastActivity?.toLocaleString() || 'Never'}
Registered: ${user.createdAt?.toLocaleString()}
    `;
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.error(error, 'User info error');
        await ctx.reply('❌ Failed to fetch user info.');
    }
}
// /ban <user_id> [reason] – ban a user
async function banUser(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the user ID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length < 1) {
        await ctx.reply('Usage: /ban <user_id> [reason]');
        return;
    }
    const id = safeParseInt(args[0]);
    if (!id) {
        await ctx.reply('Invalid user ID.');
        return;
    }
    const reason = args.slice(1).join(' ') || 'No reason provided';
    try {
        const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
        if (!user) {
            await ctx.reply('User not found.');
            return;
        }
        await database_1.db.update(schema_1.users)
            .set({ status: 'banned', isLoggedIn: 0 })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        // Invalidate all sessions by logging them out
        await (0, otp_1.setUserLoggedOut)(id);
        logger_1.default.info({ admin: ctx.from?.id, userId: id, reason }, 'User banned');
        await ctx.reply(`✅ User ${id} banned. Reason: ${reason}`);
    }
    catch (error) {
        logger_1.default.error(error, 'Ban user error');
        await ctx.reply('❌ Failed to ban user.');
    }
}
// /unban <user_id> – unban a user
async function unbanUser(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the user ID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1) {
        await ctx.reply('Usage: /unban <user_id>');
        return;
    }
    const id = safeParseInt(args[0]);
    if (!id) {
        await ctx.reply('Invalid user ID.');
        return;
    }
    try {
        const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
        if (!user) {
            await ctx.reply('User not found.');
            return;
        }
        await database_1.db.update(schema_1.users)
            .set({ status: 'active' })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        logger_1.default.info({ admin: ctx.from?.id, userId: id }, 'User unbanned');
        await ctx.reply(`✅ User ${id} unbanned.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Unban user error');
        await ctx.reply('❌ Failed to unban user.');
    }
}
// /addbalance <user_id> <amount> – manually add balance to user's wallet
async function addBalance(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the user ID and amount.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 2) {
        await ctx.reply('Usage: /addbalance <user_id> <amount>');
        return;
    }
    const id = safeParseInt(args[0]);
    if (!id) {
        await ctx.reply('Invalid user ID.');
        return;
    }
    const amountStr = args[1];
    if (!amountStr) {
        await ctx.reply('Amount is required.');
        return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        await ctx.reply('Amount must be a positive number.');
        return;
    }
    try {
        const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
        if (!user) {
            await ctx.reply('User not found.');
            return;
        }
        await database_1.db.transaction(async (tx) => {
            const [userRow] = await tx.select({ balance: schema_1.users.balance })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
                .for('update');
            if (!userRow)
                throw new Error('User not found');
            const oldBalance = parseFloat(userRow.balance);
            const newBalance = oldBalance + amount;
            await tx.update(schema_1.users)
                .set({ balance: newBalance.toString() })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
            await tx.insert(schema_1.transactions).values({
                userId: id,
                type: 'deposit',
                amount: amount.toString(),
                balanceBefore: oldBalance.toString(),
                balanceAfter: newBalance.toString(),
                referenceType: 'manual',
                referenceId: 0,
                createdAt: new Date(),
            });
        });
        logger_1.default.info({ admin: ctx.from?.id, userId: id, amount }, 'Balance added');
        await ctx.reply(`✅ Added ৳${amount.toFixed(2)} to user ${id}.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Add balance error');
        await ctx.reply('❌ Failed to add balance.');
    }
}
