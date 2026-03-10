"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyCommand = buyCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const order_1 = require("../../../services/order");
const voucher_1 = require("../../../services/voucher");
const unipin_1 = require("../../../services/unipin");
const logger_1 = __importDefault(require("../../../logger"));
async function buyCommand(ctx) {
    const dbUser = ctx.dbUser;
    if (!dbUser) {
        await ctx.reply('You need to be logged in to buy.');
        return;
    }
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the product code.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length < 1 || !args[0]) {
        await ctx.reply('Usage: /buy <variation_code> [uid]');
        return;
    }
    const shortCode = args[0];
    const uid = args[1];
    try {
        // Find variation by short code
        const [variation] = await database_1.db.select()
            .from(schema_1.variations)
            .where((0, drizzle_orm_1.eq)(schema_1.variations.shortCode, shortCode))
            .limit(1);
        if (!variation) {
            await ctx.reply('Invalid product code.');
            return;
        }
        if (variation.status !== 'active') {
            await ctx.reply('This product is currently unavailable.');
            return;
        }
        // Determine if UID is required
        if ((variation.deliveryType === 'unipin' || variation.deliveryType === 'manual') && !uid) {
            await ctx.reply('This product requires a UID. Usage: /buy <code> <uid>');
            return;
        }
        const quantity = 1;
        const price = parseFloat(variation.price);
        const total = price * quantity;
        // Get product name for snapshot
        const [product] = await database_1.db.select({ name: schema_1.products.name })
            .from(schema_1.products)
            .where((0, drizzle_orm_1.eq)(schema_1.products.id, variation.productId))
            .limit(1);
        if (!product)
            throw new Error('Product not found');
        // Create order
        const order = await (0, order_1.createOrder)({
            userId: dbUser.id,
            variationId: variation.id,
            variationTitle: variation.title,
            productName: product.name,
            price,
            quantity,
            totalAmount: total,
            uid,
            paymentMethod: 'wallet', // Only wallet supported for now
        });
        // Process wallet payment (deduct balance)
        await (0, order_1.processWalletOrder)(dbUser.id, order.id, total);
        // Handle delivery based on type
        let deliveryMessage = '';
        if (variation.deliveryType === 'voucher') {
            const code = await (0, voucher_1.assignVoucher)(variation.id, order.id);
            if (code) {
                deliveryMessage = `\n🎫 Your voucher code: \`${code}\``;
            }
            else {
                deliveryMessage = '\n⚠️ Sorry, no voucher codes available. Admin will deliver manually.';
                await database_1.db.update(schema_1.orders)
                    .set({ orderStatus: 'pending' })
                    .where((0, drizzle_orm_1.eq)(schema_1.orders.id, order.id));
            }
        }
        else if (variation.deliveryType === 'unipin') {
            if (!variation.unipinCode) {
                throw new Error('UniPin product code not configured for this variation');
            }
            if (!uid) {
                throw new Error('UID required for UniPin products');
            }
            // Call UniPin API
            try {
                const result = await (0, unipin_1.callUnipinRedeem)(uid, variation.unipinCode, 'BD'); // region can be from variation or default
                if (result.success) {
                    await database_1.db.update(schema_1.orders)
                        .set({ orderStatus: 'completed', completedAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(schema_1.orders.id, order.id));
                    deliveryMessage = '\n✅ Top‑up completed successfully!';
                }
                else {
                    // Refund wallet
                    await refundWallet(dbUser.id, total, order.id);
                    deliveryMessage = '\n❌ Top‑up failed. Your wallet has been refunded.';
                }
            }
            catch (error) {
                await refundWallet(dbUser.id, total, order.id);
                logger_1.default.error(error, 'UniPin API error');
                deliveryMessage = '\n❌ Top‑up failed due to an error. Your wallet has been refunded.';
            }
        }
        else {
            deliveryMessage = '\n⏳ Your order is pending manual processing. You will be notified when delivered.';
        }
        await ctx.reply(`✅ Order placed successfully!\n` +
            `Order ID: \`${order.orderNumber}\`\n` +
            `Product: ${variation.title}\n` +
            `Amount: ৳${total}${deliveryMessage}`);
    }
    catch (error) {
        logger_1.default.error(error, 'Buy command error');
        await ctx.reply(`❌ Purchase failed: ${error.message}`);
    }
}
// Helper function to refund wallet
async function refundWallet(userId, amount, orderId) {
    const { db } = await Promise.resolve().then(() => __importStar(require('../../../config/database')));
    const { users, transactions } = await Promise.resolve().then(() => __importStar(require('../../../models/schema')));
    const { eq } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
    await db.transaction(async (tx) => {
        const [user] = await tx.select({ balance: users.balance })
            .from(users)
            .where(eq(users.id, userId))
            .for('update');
        if (!user)
            return;
        const oldBalance = parseFloat(user.balance);
        const newBalance = oldBalance + amount;
        await tx.update(users)
            .set({ balance: newBalance.toString() })
            .where(eq(users.id, userId));
        await tx.insert(transactions).values({
            userId,
            type: 'refund',
            amount: amount.toString(),
            balanceBefore: oldBalance.toString(),
            balanceAfter: newBalance.toString(),
            referenceType: 'order',
            referenceId: orderId,
            createdAt: new Date(),
        });
    });
}
