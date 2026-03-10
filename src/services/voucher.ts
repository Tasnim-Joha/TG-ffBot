import { db } from '../config/database';
import { vouchers } from '../models/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function assignVoucher(variationId: number, orderId: number): Promise<string | null> {
  // Find an unused voucher for this variation
  const [voucher] = await db.select()
    .from(vouchers)
    .where(and(
      eq(vouchers.variationId, variationId),
      eq(vouchers.isUsed, 0),
      isNull(vouchers.orderId)
    ))
    .limit(1);

  if (!voucher) return null;

  // Mark as used
  await db.update(vouchers)
    .set({ isUsed: 1, orderId, usedAt: new Date() })
    .where(eq(vouchers.id, voucher.id));

  return voucher.code;
}