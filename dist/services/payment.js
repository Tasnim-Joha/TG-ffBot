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
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
/**
 * Create a new PipraPay payment.
 * Returns the payment URL (pp_url) and transaction ID (pp_id).
 */
async function createPipraPayPayment(userId, amount) {
    const baseUrl = settings_1.settings.get('piprapay_base_url', '').replace(/^"|"$/g, '');
    const apiKey = settings_1.settings.get('piprapay_api_key', '').replace(/^"|"$/g, '');
    if (!baseUrl || !apiKey) {
        throw new Error('PipraPay not configured');
    }
    // Get user details
    const [user] = await database_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
    if (!user)
        throw new Error('User not found');
    if (!user.phone) {
        throw new Error('Phone number missing. Please set your phone using /setphone <number>');
    }
    const idempotencyKey = (0, crypto_1.randomUUID)();
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
        const response = await axios_1.default.post(`${baseUrl}/api/checkout/redirect`, payload, {
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
        const [deposit] = await database_1.db.insert(schema_1.deposits).values({
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
    }
    catch (error) {
        logger_1.default.error({ error, payload }, 'PipraPay create payment error');
        throw new Error('Failed to create payment');
    }
}
/**
 * Verify a payment by pp_id.
 * Returns the payment status and amount.
 */
async function verifyPipraPayPayment(pp_id) {
    const baseUrl = settings_1.settings.get('piprapay_base_url', '').replace(/^"|"$/g, '');
    const apiKey = settings_1.settings.get('piprapay_api_key', '').replace(/^"|"$/g, '');
    try {
        const response = await axios_1.default.post(`${baseUrl}/api/verify-payment`, { pp_id }, {
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
    }
    catch (error) {
        logger_1.default.error({ error, pp_id }, 'PipraPay verify error');
        throw new Error('Failed to verify payment');
    }
}
/**
 * Refund a payment by pp_id.
 * Returns true if successful.
 */
async function refundPipraPayPayment(pp_id) {
    const baseUrl = settings_1.settings.get('piprapay_base_url', '').replace(/^"|"$/g, '');
    const apiKey = settings_1.settings.get('piprapay_api_key', '').replace(/^"|"$/g, '');
    try {
        const response = await axios_1.default.post(`${baseUrl}/api/refund-payment`, { pp_id }, {
            headers: {
                'MHS-PIPRAPAY-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        // Response likely same as verify, we just check status 200
        return response.status === 200;
    }
    catch (error) {
        logger_1.default.error({ error, pp_id }, 'PipraPay refund error');
        throw new Error('Failed to refund payment');
    }
}
/**
 * Complete a deposit (credit user wallet) after successful payment.
 * Used by webhook and manual verify.
 */
async function completeDeposit(depositId, userId, amount) {
    await database_1.db.transaction(async (tx) => {
        // Lock user row
        const [user] = await tx.select({ balance: schema_1.users.balance })
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
    });
}
