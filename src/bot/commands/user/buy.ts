import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { products, variations, orders } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import { createOrder, processWalletOrder } from '../../../services/order';
import { assignVoucher } from '../../../services/voucher';
import { callUnipinRedeem } from '../../../services/unipin';
import logger from '../../../logger';

export async function buyCommand(ctx: Context) {
  const dbUser = (ctx as any).dbUser;
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
    const [variation] = await db.select()
      .from(variations)
      .where(eq(variations.shortCode, shortCode))
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
    const [product] = await db.select({ name: products.name })
      .from(products)
      .where(eq(products.id, variation.productId))
      .limit(1);
    if (!product) throw new Error('Product not found');

    // Create order
    const order = await createOrder({
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
    await processWalletOrder(dbUser.id, order.id, total);

    // Handle delivery based on type
    let deliveryMessage = '';
    if (variation.deliveryType === 'voucher') {
      const code = await assignVoucher(variation.id, order.id);
      if (code) {
        deliveryMessage = `\n🎫 Your voucher code: \`${code}\``;
      } else {
        deliveryMessage = '\n⚠️ Sorry, no voucher codes available. Admin will deliver manually.';
        await db.update(orders)
          .set({ orderStatus: 'pending' })
          .where(eq(orders.id, order.id));
      }
    } else if (variation.deliveryType === 'unipin') {
      if (!variation.unipinCode) {
        throw new Error('UniPin product code not configured for this variation');
      }
      if (!uid) {
        throw new Error('UID required for UniPin products');
      }
      // Call UniPin API
      try {
        const result = await callUnipinRedeem(uid, variation.unipinCode, 'BD'); // region can be from variation or default
        if (result.success) {
          await db.update(orders)
            .set({ orderStatus: 'completed', completedAt: new Date() })
            .where(eq(orders.id, order.id));
          deliveryMessage = '\n✅ Top‑up completed successfully!';
        } else {
          // Refund wallet
          await refundWallet(dbUser.id, total, order.id);
          deliveryMessage = '\n❌ Top‑up failed. Your wallet has been refunded.';
        }
      } catch (error) {
        await refundWallet(dbUser.id, total, order.id);
        logger.error(error, 'UniPin API error');
        deliveryMessage = '\n❌ Top‑up failed due to an error. Your wallet has been refunded.';
      }
    } else {
      deliveryMessage = '\n⏳ Your order is pending manual processing. You will be notified when delivered.';
    }

    await ctx.reply(
      `✅ Order placed successfully!\n` +
      `Order ID: \`${order.orderNumber}\`\n` +
      `Product: ${variation.title}\n` +
      `Amount: ৳${total}${deliveryMessage}`
    );

  } catch (error: any) {
    logger.error(error, 'Buy command error');
    await ctx.reply(`❌ Purchase failed: ${error.message}`);
  }
}

// Helper function to refund wallet
async function refundWallet(userId: number, amount: number, orderId: number) {
  const { db } = await import('../../../config/database');
  const { users, transactions } = await import('../../../models/schema');
  const { eq } = await import('drizzle-orm');

  await db.transaction(async (tx) => {
    const [user] = await tx.select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId))
      .for('update');
    if (!user) return;
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