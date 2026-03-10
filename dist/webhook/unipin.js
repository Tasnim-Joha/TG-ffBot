"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUnipinWebhook = handleUnipinWebhook;
const database_1 = require("../config/database");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../logger"));
async function handleUnipinWebhook(req, res) {
    const payload = req.body;
    logger_1.default.info({ payload }, 'UniPin webhook received');
    // Expected payload structure (depends on what androidartist sends)
    const { orderid, status, message } = payload;
    if (!orderid) {
        return res.status(400).json({ error: 'Missing orderid' });
    }
    try {
        const [order] = await database_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.orderNumber, orderid)).limit(1);
        if (!order) {
            logger_1.default.warn({ orderid }, 'Order not found for UniPin webhook');
            return res.status(404).json({ error: 'Order not found' });
        }
        if (status === 'success') {
            await database_1.db.update(schema_1.orders)
                .set({ orderStatus: 'completed', completedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.orders.id, order.id));
            logger_1.default.info({ orderId: order.id }, 'Order marked completed via UniPin webhook');
        }
        else {
            // Optionally handle failure – you might want to refund or notify admin
            logger_1.default.warn({ orderId: order.id, message }, 'UniPin top‑up failed via webhook');
        }
        res.sendStatus(200);
    }
    catch (error) {
        logger_1.default.error(error, 'UniPin webhook error');
        res.sendStatus(500);
    }
}
