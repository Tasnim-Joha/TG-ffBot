import { Context } from 'telegraf';
import { db } from '../../config/database';
import { users } from '../../models/schema';
import { eq } from 'drizzle-orm';

export async function isSuperAdmin(telegramId?: number): Promise<boolean> {
  if (!telegramId) return false;
  const user = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
  if (user.length === 0) return false;
  const foundUser = user[0];
  if (!foundUser) return false;
  return foundUser.role === 'super_admin';
}