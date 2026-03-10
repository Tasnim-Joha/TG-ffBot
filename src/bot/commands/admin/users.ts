import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users, transactions } from '../../../models/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { setUserLoggedOut } from '../../../services/otp';
import logger from '../../../logger';

function safeParseInt(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

// /users [page] – list all users with pagination
export async function listUsers(ctx: Context) {
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
    const userList = await db.select({
      id: users.id,
      telegramId: users.telegramId,
      name: users.name,
      email: users.email,
      balance: users.balance,
      role: users.role,
      isLoggedIn: users.isLoggedIn,
      status: (users as any).status, // Cast to any to avoid missing property error
      createdAt: users.createdAt,
    })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalPages = Math.ceil(totalCount[0]!.count / limit);

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
  } catch (error) {
    logger.error(error, 'List users error');
    await ctx.reply('❌ Failed to fetch users.');
  }
}

// /userinfo <user_id> – view detailed user info
export async function userInfo(ctx: Context) {
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
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      await ctx.reply('User not found.');
      return;
    }

    const userAny = user as any; // Cast to access status if needed
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
  } catch (error) {
    logger.error(error, 'User info error');
    await ctx.reply('❌ Failed to fetch user info.');
  }
}

// /ban <user_id> [reason] – ban a user
export async function banUser(ctx: Context) {
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
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      await ctx.reply('User not found.');
      return;
    }

    await db.update(users)
      .set({ status: 'banned', isLoggedIn: 0 } as any)
      .where(eq(users.id, id));

    // Invalidate all sessions by logging them out
    await setUserLoggedOut(id);

    logger.info({ admin: ctx.from?.id, userId: id, reason }, 'User banned');
    await ctx.reply(`✅ User ${id} banned. Reason: ${reason}`);
  } catch (error) {
    logger.error(error, 'Ban user error');
    await ctx.reply('❌ Failed to ban user.');
  }
}

// /unban <user_id> – unban a user
export async function unbanUser(ctx: Context) {
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
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      await ctx.reply('User not found.');
      return;
    }

    await db.update(users)
      .set({ status: 'active' } as any)
      .where(eq(users.id, id));

    logger.info({ admin: ctx.from?.id, userId: id }, 'User unbanned');
    await ctx.reply(`✅ User ${id} unbanned.`);
  } catch (error) {
    logger.error(error, 'Unban user error');
    await ctx.reply('❌ Failed to unban user.');
  }
}

// /addbalance <user_id> <amount> – manually add balance to user's wallet
export async function addBalance(ctx: Context) {
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
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      await ctx.reply('User not found.');
      return;
    }

    await db.transaction(async (tx) => {
      const [userRow] = await tx.select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, id))
        .for('update');

      if (!userRow) throw new Error('User not found');

      const oldBalance = parseFloat(userRow.balance);
      const newBalance = oldBalance + amount;

      await tx.update(users)
        .set({ balance: newBalance.toString() })
        .where(eq(users.id, id));

      await tx.insert(transactions).values({
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

    logger.info({ admin: ctx.from?.id, userId: id, amount }, 'Balance added');
    await ctx.reply(`✅ Added ৳${amount.toFixed(2)} to user ${id}.`);
  } catch (error) {
    logger.error(error, 'Add balance error');
    await ctx.reply('❌ Failed to add balance.');
  }
}