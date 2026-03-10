import { db } from '../config/database';
import { users, transactions } from '../models/schema';
import { eq, sql } from 'drizzle-orm';

export async function getUserBalance(userId: number): Promise<number> {
  const [result] = await db.select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, userId));
  return result ? parseFloat(result.balance) : 0;
}

export async function updateUserBalance(userId: number, newBalance: number): Promise<void> {
  await db.update(users)
    .set({ balance: newBalance.toString(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function createTransaction(data: {
  userId: number;
  type: 'deposit' | 'debit' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: 'order' | 'deposit' | 'manual';
  referenceId: number;
}) {
  await db.insert(transactions).values({
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