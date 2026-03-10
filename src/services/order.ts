import { db } from '../config/database';
import { users, orders, transactions, vouchers } from '../models/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { randomInt } from 'crypto';

export async function generateOrderNumber(): Promise<string> {
  const prefix = 'FF';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomInt(1000, 9999).toString();
  const orderNumber = `${prefix}${timestamp}${random}`;
  return orderNumber;
}

export async function createOrder(data: {
  userId: number;
  variationId: number;
  variationTitle: string;
  productName: string;
  price: number;
  quantity: number;
  totalAmount: number;
  uid?: string;
  paymentMethod: string;
}) {
  const orderNumber = await generateOrderNumber();
  const [order] = await db.insert(orders).values({
    userId: data.userId,
    variationId: data.variationId,
    productNameSnapshot: data.productName,
    variationTitleSnapshot: data.variationTitle,
    priceSnapshot: data.price.toString(),
    uid: data.uid,
    quantity: data.quantity,
    totalAmount: data.totalAmount.toString(),
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentMethod === 'wallet' ? 'paid' : 'pending',
    orderStatus: data.paymentMethod === 'wallet' ? 'processing' : 'pending',
    orderNumber,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).$returningId();

  if (!order?.id) throw new Error('Failed to create order');
  return { ...data, id: order.id, orderNumber };
}

export async function processWalletOrder(userId: number, orderId: number, totalAmount: number) {
  await db.transaction(async (tx) => {
    // Lock user row
    const [user] = await tx.select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId))
      .for('update');

    if (!user) throw new Error('User not found');
    const balance = parseFloat(user.balance);
    if (balance < totalAmount) throw new Error('Insufficient balance');

    const newBalance = balance - totalAmount;

    // Update balance
    await tx.update(users)
      .set({ balance: newBalance.toString() })
      .where(eq(users.id, userId));

    // Record transaction – removed 'remark' field to match schema
    await tx.insert(transactions).values({
      userId,
      type: 'debit',
      amount: totalAmount.toString(),
      balanceBefore: balance.toString(),
      balanceAfter: newBalance.toString(),
      referenceType: 'order',
      referenceId: orderId,
      createdAt: new Date(),
    });

    // Update order payment status
    await tx.update(orders)
      .set({ paymentStatus: 'paid', orderStatus: 'processing' })
      .where(eq(orders.id, orderId));
  });
}