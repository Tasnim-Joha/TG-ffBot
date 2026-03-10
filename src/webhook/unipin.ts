import { Request, Response } from 'express';
import { db } from '../config/database';
import { orders } from '../models/schema';
import { eq } from 'drizzle-orm';
import logger from '../logger';

export async function handleUnipinWebhook(req: Request, res: Response) {
  const payload = req.body;
  logger.info({ payload }, 'UniPin webhook received');

  // Expected payload structure (depends on what androidartist sends)
  const { orderid, status, message } = payload;
  if (!orderid) {
    return res.status(400).json({ error: 'Missing orderid' });
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderid)).limit(1);
    if (!order) {
      logger.warn({ orderid }, 'Order not found for UniPin webhook');
      return res.status(404).json({ error: 'Order not found' });
    }

    if (status === 'success') {
      await db.update(orders)
        .set({ orderStatus: 'completed', completedAt: new Date() })
        .where(eq(orders.id, order.id));
      logger.info({ orderId: order.id }, 'Order marked completed via UniPin webhook');
    } else {
      // Optionally handle failure – you might want to refund or notify admin
      logger.warn({ orderId: order.id, message }, 'UniPin top‑up failed via webhook');
    }
    res.sendStatus(200);
  } catch (error) {
    logger.error(error, 'UniPin webhook error');
    res.sendStatus(500);
  }
}