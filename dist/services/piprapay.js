"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPipraPayPayment = createPipraPayPayment;
exports.verifyPipraPayPayment = verifyPipraPayPayment;
exports.refundPipraPayPayment = refundPipraPayPayment;
exports.completeDeposit = completeDeposit;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const database_1 = require("../config/database");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const settings_1 = require("../config/settings");
const logger_1 = __importDefault(require("../logger"));
const app_1 = require("../app"); // we'll export bot from app.ts in step 4
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
/**
 * Helper to load PipraPay config from database
 */
async function getConfig() {
    const baseUrl = settings_1.settings.get('piprapay_base_url', '').replace(/^"|"$/g, '');
    const apiKey = settings_1.settings.get('piprapay_api_key', '').replace(/^"|"$/g, '');
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
async function createPipraPayPayment(userId, amount, currency = 'BDT') {
    const { baseUrl, apiKey } = await getConfig();
    // Get user details
    const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
    if (!user)
        throw new Error('User not found');
    if (!user.phone) {
        throw new Error('Phone number missing. Please set your phone using /setphone <number>');
    }
    const idempotencyKey = (0, crypto_1.randomUUID)();
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
        const response = await axios_1.default.post(`${baseUrl}/api/checkout/redirect`, payload, {
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
        const [deposit] = await database_1.db.insert(schema_1.deposits).values({
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
    }
    catch (error) {
        logger_1.default.error({ error, payload }, 'PipraPay create payment error');
        throw new Error(error.response?.data?.error?.message || 'Failed to create payment');
    }
}
/**
 * Verify a payment by pp_id
 */
async function verifyPipraPayPayment(pp_id) {
    const { baseUrl, apiKey } = await getConfig();
    try {
        const response = await axios_1.default.post(`${baseUrl}/api/verify-payment`, { pp_id }, {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'MHS-PIPRAPAY-API-KEY': apiKey,
            },
            timeout: 10000,
        });
        return response.data; // full transaction details
    }
    catch (error) {
        logger_1.default.error({ error, pp_id }, 'PipraPay verify error');
        throw new Error(error.response?.data?.error?.message || 'Failed to verify payment');
    }
}
/**
 * Refund a payment by pp_id
 */
async function refundPipraPayPayment(pp_id) {
    const { baseUrl, apiKey } = await getConfig();
    try {
        const response = await axios_1.default.post(`${baseUrl}/api/refund-payment`, { pp_id }, {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'MHS-PIPRAPAY-API-KEY': apiKey,
            },
            timeout: 10000,
        });
        return response.status === 200;
    }
    catch (error) {
        logger_1.default.error({ error, pp_id }, 'PipraPay refund error');
        throw new Error(error.response?.data?.error?.message || 'Failed to refund payment');
    }
}
/**
 * Complete a deposit after successful payment.
 * Updates user balance, marks deposit completed, logs transaction,
 * and sends Telegram notification to the user.
 */
async function completeDeposit(depositId, userId, amount) {
    await database_1.db.transaction(async (tx) => {
        // Lock user row
        const [user] = await tx.select({ balance: schema_1.users.balance, telegramId: schema_1.users.telegramId })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .for('update');
        if (!user)
            throw new Error('User not found');
        const oldBalance = parseFloat(user.balance);
        const newBalance = oldBalance + amount;
        // Update user balance
        await tx.update(schema_1.users)
            .set({ balance: newBalance.toString() })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        // Insert transaction record
        await tx.insert(schema_1.transactions).values({
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
        await tx.update(schema_1.deposits)
            .set({ status: 'completed', updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.deposits.id, depositId));
        // Send Telegram notification (non‑blocking)
        if (user.telegramId) {
            app_1.bot.telegram.sendMessage(user.telegramId, `✅ Your deposit of ৳${amount} has been confirmed and added to your balance.`).catch(err => logger_1.default.error({ err, userId }, 'Failed to send deposit confirmation'));
        }
    });
}
