import axios from 'axios';
import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { deposits, users, transactions } from '../models/schema';
import { eq } from 'drizzle-orm';
import { settings } from '../config/settings';
import logger from '../logger';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

/**
 * Create a new PipraPay payment.
 * Returns the payment URL (pp_url) and transaction ID (pp_id).
 */
export async function createPipraPayPayment(
  userId: number,
  amount: number
): Promise<{ pp_url: string; pp_id: string }> {
  const baseUrl = settings.get<string>('piprapay_base_url', '').replace(/^"|"$/g, '');
  const apiKey = settings.get<string>('piprapay_api_key', '').replace(/^"|"$/g, '');

  if (!baseUrl || !apiKey) {
    throw new Error('PipraPay not configured');
  }

  // Get user details
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');
  if (!user.phone) {
    throw new Error('Phone number missing. Please set your phone using /setphone <number>');
  }

  const idempotencyKey = randomUUID();
  const metadata = JSON.stringify({ userId, depositId: null }); // we'll update after insert

  const payload = {
    full_name: user.name || 'Customer',
    email_address: user.email,
    mobile_number: user.phone,
    amount: amount.toString(),
    currency: 'BDT',
    metadata,
    return_url: `${APP_BASE_URL}/payment/return`, // placeholder; you can create a simple page later
    webhook_url: `${APP_BASE_URL}/webhook/piprapay`,
  };

  try {
    const response = await axios.post(`${baseUrl}/api/checkout/redirect`, payload, {
      headers: {
        'MHS-PIPRAPAY-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const { pp_id, pp_url } = response.data;
    if (!pp_id || !pp_url) {
      throw new Error('Invalid response from PipraPay');
    }

    // Insert deposit record (pending)
    const [deposit] = await db.insert(deposits).values({
      userId,
      amount: amount.toString(),
      status: 'pending',
      gatewayRef: pp_id,
      idempotencyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).$returningId();

    // Update metadata with depositId (optional, but useful)
    // We could update the deposit record later; not required now.

    return { pp_url, pp_id };
  } catch (error: any) {
    logger.error({ error, payload }, 'PipraPay create payment error');
    throw new Error('Failed to create payment');
  }
}

/**
 * Verify a payment by pp_id.
 * Returns the payment status and amount.
 */
export async function verifyPipraPayPayment(pp_id: string): Promise<{ status: string; amount: number; metadata?: any }> {
  const baseUrl = settings.get<string>('piprapay_base_url', '').replace(/^"|"$/g, '');
  const apiKey = settings.get<string>('piprapay_api_key', '').replace(/^"|"$/g, '');

  try {
    const response = await axios.post(`${baseUrl}/api/verify-payment`, { pp_id }, {
      headers: {
        'MHS-PIPRAPAY-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    return {
      status: response.data.status,
      amount: parseFloat(response.data.amount),
      metadata: response.data.metadata,
    };
  } catch (error: any) {
    logger.error({ error, pp_id }, 'PipraPay verify error');
    throw new Error('Failed to verify payment');
  }
}

/**
 * Refund a payment by pp_id.
 * Returns true if successful.
 */
export async function refundPipraPayPayment(pp_id: string): Promise<boolean> {
  const baseUrl = settings.get<string>('piprapay_base_url', '').replace(/^"|"$/g, '');
  const apiKey = settings.get<string>('piprapay_api_key', '').replace(/^"|"$/g, '');

  try {
    const response = await axios.post(`${baseUrl}/api/refund-payment`, { pp_id }, {
      headers: {
        'MHS-PIPRAPAY-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    // Response likely same as verify, we just check status 200
    return response.status === 200;
  } catch (error: any) {
    logger.error({ error, pp_id }, 'PipraPay refund error');
    throw new Error('Failed to refund payment');
  }
}

/**
 * Complete a deposit (credit user wallet) after successful payment.
 * Used by webhook and manual verify.
 */
export async function completeDeposit(depositId: number, userId: number, amount: number) {
  await db.transaction(async (tx) => {
    // Lock user row
    const [user] = await tx.select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId))
      .for('update');

    if (!user) throw new Error('User not found');

    const oldBalance = parseFloat(user.balance);
    const newBalance = oldBalance + amount;

    // Update user balance
    await tx.update(users)
      .set({ balance: newBalance.toString() })
      .where(eq(users.id, userId));

    // Insert transaction record
    await tx.insert(transactions).values({
      userId,
      type: 'deposit',
      amount: amount.toString(),
      balanceBefore: oldBalance.toString(),
      balanceAfter: newBalance.toString(),
      referenceType: 'deposit',
      referenceId: depositId,
      createdAt: new Date(),
    });

    // Update deposit status
    await tx.update(deposits)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(deposits.id, depositId));
  });
}