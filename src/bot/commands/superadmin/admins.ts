import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { users } from '../../../models/schema';
import { eq, and } from 'drizzle-orm';
import { settings } from '../../../config/settings';
import logger from '../../../logger';

function safeParseInt(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

// /addadmin <user_id> – promote a user to admin (adds to admin_ids and sets role to admin)
export async function addAdmin(ctx: Context) {
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
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      await ctx.reply('User not found.');
      return;
    }

    // Update role to admin
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, userId));

    // Also add to admin_ids setting
    const adminIds = settings.get<number[]>('admin_ids', []);
    if (!adminIds.includes(user.telegramId!)) {
      adminIds.push(user.telegramId!);
      await settings.set('admin_ids', adminIds);
    }

    logger.info({ superadmin: ctx.from?.id, targetUserId: userId }, 'User promoted to admin');
    await ctx.reply(`✅ User ${userId} (${user.name}) is now an admin.`);
  } catch (error) {
    logger.error(error, 'Add admin error');
    await ctx.reply('❌ Failed to promote user.');
  }
}

// /removeadmin <user_id> – demote admin to user
export async function removeAdmin(ctx: Context) {
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
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      await ctx.reply('User not found.');
      return;
    }

    if (user.role === 'super_admin') {
      await ctx.reply('Cannot demote a super admin. Use /setsuperadmin first.');
      return;
    }

    await db.update(users)
      .set({ role: 'user' })
      .where(eq(users.id, userId));

    const adminIds = settings.get<number[]>('admin_ids', []);
    const filtered = adminIds.filter(id => id !== user.telegramId);
    await settings.set('admin_ids', filtered);

    logger.info({ superadmin: ctx.from?.id, targetUserId: userId }, 'Admin demoted to user');
    await ctx.reply(`✅ User ${userId} is now a regular user.`);
  } catch (error) {
    logger.error(error, 'Remove admin error');
    await ctx.reply('❌ Failed to demote user.');
  }
}

// /listadmins – list all admins and superadmins
export async function listAdmins(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message.');
    return;
  }

  try {
    const admins = await db.select({
      id: users.id,
      telegramId: users.telegramId,
      name: users.name,
      email: users.email,
      role: users.role,
    })
      .from(users)
      .where(eq(users.role, 'admin'));

    const superAdmins = await db.select({
      id: users.id,
      telegramId: users.telegramId,
      name: users.name,
      email: users.email,
      role: users.role,
    })
      .from(users)
      .where(eq(users.role, 'super_admin'));

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
    } else {
      message += 'No admins found.';
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'List admins error');
    await ctx.reply('❌ Failed to list admins.');
  }
}

// /setsuperadmin <user_id> – grant super admin role
export async function setSuperAdmin(ctx: Context) {
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
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      await ctx.reply('User not found.');
      return;
    }

    await db.update(users)
      .set({ role: 'super_admin' })
      .where(eq(users.id, userId));

    const adminIds = settings.get<number[]>('admin_ids', []);
    if (!adminIds.includes(user.telegramId!)) {
      adminIds.push(user.telegramId!);
      await settings.set('admin_ids', adminIds);
    }

    logger.info({ superadmin: ctx.from?.id, targetUserId: userId }, 'User promoted to superadmin');
    await ctx.reply(`✅ User ${userId} is now a super admin.`);
  } catch (error) {
    logger.error(error, 'Set superadmin error');
    await ctx.reply('❌ Failed to set super admin.');
  }
}