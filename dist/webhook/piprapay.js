"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePipraPayWebhook = handlePipraPayWebhook;
const database_1 = require("../config/database");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const piprapay_1 = require("../services/piprapay");
const logger_1 = __importDefault(require("../logger"));
async function handlePipraPayWebhook(req, res) {
    const payload = req.body;
    logger_1.default.info({ pp_id: payload.pp_id, status: payload.status }, 'PipraPay webhook received');
    // Always acknowledge immediately
    res.sendStatus(200);
    // Now process asynchronously (to avoid blocking response)
    (async () => {
        try {
            if (!payload.pp_id) {
                logger_1.default.warn('Webhook missing pp_id');
                return;
            }
            // Find deposit by gatewayRef
            const [deposit] = await database_1.db.select()
                .from(schema_1.deposits)
                .where((0, drizzle_orm_1.eq)(schema_1.deposits.gatewayRef, payload.pp_id))
                .limit(1);
            if (!deposit) {
                logger_1.default.warn({ pp_id: payload.pp_id }, 'Deposit not found for webhook');
                return;
            }
            // Ignore if already completed
            if (deposit.status === 'completed') {
                logger_1.default.info({ depositId: deposit.id }, 'Deposit already completed');
                return;
            }
            if (payload.status === 'completed') {
                await (0, piprapay_1.completeDeposit)(deposit.id, deposit.userId, parseFloat(deposit.amount));
                logger_1.default.info({ depositId: deposit.id }, 'Deposit completed via webhook');
            }
            else {
                // Optionally mark as failed
                await database_1.db.update(schema_1.deposits)
                    .set({ status: payload.status, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.deposits.id, deposit.id));
                logger_1.default.warn({ depositId: deposit.id, status: payload.status }, 'Deposit status updated');
            }
        }
        catch (error) {
            logger_1.default.error(error, 'Webhook async processing error');
        }
    })();
}
