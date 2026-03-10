import axios from 'axios';
import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { deposits, users, transactions } from '../models/schema';
import { eq } from 'drizzle-orm';
import { settings } from '../config/settings';
import logger from '../logger';
import { bot } from '../app'; // we'll export bot from app.ts in step 4

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

/**
 * Helper to load PipraPay config from database
 */
async function getConfig() {
  const baseUrl = settings.get<string>('piprapay_base_url', '').replace(/^"|"$/g, '');
  const apiKey = settings.get<string>('piprapay_api_key', '').replace(/^"|"$/g, '');
  if (!baseUrl || !apiKey) {
    throw new Error('PipraPay not configured. Please set piprapay_base_url and piprapay_api_key in settings.');
  }
  // Remove trailing slash if present
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

/**
 * Create a new PipraPay payment
 * Returns { pp_url, pp_id }
 */
export async function createPipraPayPayment(
  userId: number,
  amount: number,
  currency: string = 'BDT'
): Promise<{ pp_url: string; pp_id: string }> {
  const { baseUrl, apiKey } = await getConfig();

  // Get user details
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');
  if (!user.phone) {
    throw new Error('Phone number missing. Please set your phone using /setphone <number>');
  }

  const idempotencyKey = randomUUID();
  const metadata = JSON.stringify({ userId, depositId: null }); // depositId will be updated later

  const payload = {
    full_name: user.name || 'Customer',
    email_address: user.email,
    mobile_number: user.phone,
    amount: amount.toString(),
    currency: currency,
    metadata,
    return_url: `${APP_BASE_URL}/payment/return`,
    webhook_url: `${APP_BASE_URL}/webhook/piprapay`,
  };

  try {
    const response = await axios.post(`${baseUrl}/api/checkout/redirect`, payload, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'MHS-PIPRAPAY-API-KEY': apiKey,
      },
      timeout: 10000,
    });

    const { pp_id, pp_url } = response.data;
    if (!pp_id || !pp_url) {
      throw new Error('Invalid response from PipraPay: missing pp_id or pp_url');
    }

    // Insert deposit record (pending)
    const [deposit] = await db.insert(deposits).values({
      userId,
      amount: amount.toString(),
      currency,
      status: 'pending',
      gatewayRef: pp_id,
      idempotencyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).$returningId();

    // Update metadata with depositId (optional, but nice)
    // We could ignore this as we have gatewayRef

    return { pp_url, pp_id };
  } catch (error: any) {
    logger.error({ error, payload }, 'PipraPay create payment error');
    throw new Error(error.response?.data?.error?.message || 'Failed to create payment');
  }
}

/**
 * Verify a payment by pp_id
 */
export async function verifyPipraPayPayment(pp_id: string) {
  const { baseUrl, apiKey } = await getConfig();
  try {
    const response = await axios.post(`${baseUrl}/api/verify-payment`, { pp_id }, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'MHS-PIPRAPAY-API-KEY': apiKey,
      },
      timeout: 10000,
    });
    return response.data; // full transaction details
  } catch (error: any) {
    logger.error({ error, pp_id }, 'PipraPay verify error');
    throw new Error(error.response?.data?.error?.message || 'Failed to verify payment');
  }
}

/**
 * Refund a payment by pp_id
 */
export async function refundPipraPayPayment(pp_id: string): Promise<boolean> {
  const { baseUrl, apiKey } = await getConfig();
  try {
    const response = await axios.post(`${baseUrl}/api/refund-payment`, { pp_id }, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'MHS-PIPRAPAY-API-KEY': apiKey,
      },
      timeout: 10000,
    });
    return response.status === 200;
  } catch (error: any) {
    logger.error({ error, pp_id }, 'PipraPay refund error');
    throw new Error(error.response?.data?.error?.message || 'Failed to refund payment');
  }
}

/**
 * Complete a deposit after successful payment.
 * Updates user balance, marks deposit completed, logs transaction,
 * and sends Telegram notification to the user.
 */
export async function completeDeposit(depositId: number, userId: number, amount: number) {
  await db.transaction(async (tx) => {
    // Lock user row
    const [user] = await tx.select({ balance: users.balance, telegramId: users.telegramId })
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

    // Send Telegram notification (non‑blocking)
    if (user.telegramId) {
      bot.telegram.sendMessage(
        user.telegramId,
        `✅ Your deposit of ৳${amount} has been confirmed and added to your balance.`
      ).catch(err => logger.error({ err, userId }, 'Failed to send deposit confirmation'));
    }
  });
}