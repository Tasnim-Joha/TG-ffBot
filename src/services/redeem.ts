import { db } from '../config/database';
import { usedCodes, orders } from '../models/schema';
import { eq } from 'drizzle-orm';
import { callUnipinRedeem } from './unipin';
import logger from '../logger';

export async function redeemExternalCode(
  userId: number,
  code: string,
  uid?: string
): Promise<{ success: boolean; message: string; orderId?: number }> {
  // Check if code already used
  const existing = await db.select().from(usedCodes).where(eq(usedCodes.code, code)).limit(1);
  if (existing.length > 0) {
    return { success: false, message: 'This code has already been redeemed.' };
  }

  // Create an order record for tracking – only include necessary columns
  const [order] = await db.insert(orders).values({
    userId,
    variationId: null,
    productNameSnapshot: 'External Code Redemption',
    variationTitleSnapshot: 'External Code',
    priceSnapshot: '0.00',
    uid: uid || null,
    quantity: 1,
    totalAmount: '0.00',
    paymentMethod: 'redeem',
    paymentStatus: 'paid',
    orderStatus: 'processing',
    orderNumber: `EXT-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).$returningId();

  if (!order?.id) {
    return { success: false, message: 'Failed to create order record.' };
  }

  // Attempt to redeem via UniPin if uid provided
  let redeemSuccess = true;
  let errorMessage = '';
  if (uid) {
    try {
      const unipinResult = await callUnipinRedeem(uid, code);
      if (!unipinResult.success) {
        redeemSuccess = false;
        errorMessage = unipinResult.message ?? 'Unknown error';
      }
    } catch (error: any) {
      logger.error(error, 'UniPin redeem error');
      redeemSuccess = false;
      errorMessage = error.message ?? 'Unknown error';
    }
  } else {
    // For codes that don't require UID, we just mark as used.
    redeemSuccess = true;
  }

  // Record the used code
  await db.insert(usedCodes).values({
    code,
    userId,
    orderId: order.id,
    usedAt: new Date(),
  });

  // Update order status based on redemption result
  await db.update(orders)
    .set({
      orderStatus: redeemSuccess ? 'completed' : 'cancelled',
      completedAt: redeemSuccess ? new Date() : null,
    })
    .where(eq(orders.id, order.id));

  if (redeemSuccess) {
    return { success: true, message: 'Code redeemed successfully!', orderId: order.id };
  } else {
    return { success: false, message: `Code redemption failed: ${errorMessage}`, orderId: order.id };
  }
}