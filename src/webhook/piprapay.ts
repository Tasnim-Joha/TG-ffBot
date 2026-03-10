import { Request, Response } from 'express';
import { db } from '../config/database';
import { deposits } from '../models/schema';
import { eq } from 'drizzle-orm';
import { completeDeposit } from '../services/piprapay';
import logger from '../logger';

export async function handlePipraPayWebhook(req: Request, res: Response) {
  const payload = req.body;
  logger.info({ pp_id: payload.pp_id, status: payload.status }, 'PipraPay webhook received');

  // Always acknowledge immediately
  res.sendStatus(200);

  // Now process asynchronously (to avoid blocking response)
  (async () => {
    try {
      if (!payload.pp_id) {
        logger.warn('Webhook missing pp_id');
        return;
      }

      // Find deposit by gatewayRef
      const [deposit] = await db.select()
        .from(deposits)
        .where(eq(deposits.gatewayRef, payload.pp_id))
        .limit(1);

      if (!deposit) {
        logger.warn({ pp_id: payload.pp_id }, 'Deposit not found for webhook');
        return;
      }

      // Ignore if already completed
      if (deposit.status === 'completed') {
        logger.info({ depositId: deposit.id }, 'Deposit already completed');
        return;
      }

      if (payload.status === 'completed') {
        await completeDeposit(deposit.id, deposit.userId, parseFloat(deposit.amount));
        logger.info({ depositId: deposit.id }, 'Deposit completed via webhook');
      } else {
        // Optionally mark as failed
        await db.update(deposits)
          .set({ status: payload.status, updatedAt: new Date() })
          .where(eq(deposits.id, deposit.id));
        logger.warn({ depositId: deposit.id, status: payload.status }, 'Deposit status updated');
      }
    } catch (error) {
      logger.error(error, 'Webhook async processing error');
    }
  })();
}