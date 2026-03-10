"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
// index.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const telegraf_1 = require("telegraf");
const database_1 = require("./config/database");
const settings_1 = require("./config/settings");
const drizzle_orm_1 = require("drizzle-orm");
const bot_1 = require("./bot");
const logger_1 = __importDefault(require("./logger"));
const unipin_1 = require("./webhook/unipin");
const piprapay_1 = require("./webhook/piprapay");
const PORT = process.env.PORT || 3000;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
if (!WEBHOOK_DOMAIN) {
    logger_1.default.fatal('❌ WEBHOOK_DOMAIN is not set in environment');
    process.exit(1);
}
// Export bot instance so it can be used in other files (e.g., services)
exports.bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
const app = (0, express_1.default)();
app.use(express_1.default.json());
// ---------- Start Bot ----------
async function startBot() {
    try {
        await database_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
        logger_1.default.info('✅ Database connected');
    }
    catch (error) {
        logger_1.default.fatal(`❌ Database connection failed: ${error}`);
        process.exit(1);
    }
    try {
        await settings_1.settings.load();
        logger_1.default.info('✅ Settings loaded');
    }
    catch (error) {
        logger_1.default.fatal(`❌ Failed to load settings: ${error}`);
        process.exit(1);
    }
    (0, bot_1.setupBot)(exports.bot);
    await exports.bot.launch();
    logger_1.default.info('🤖 Bot started');
    const webhookUrl = `${WEBHOOK_DOMAIN}/webhook/${process.env.BOT_TOKEN}`;
    try {
        await exports.bot.telegram.setWebhook(webhookUrl);
        logger_1.default.info(`✅ Webhook set to ${webhookUrl}`);
    }
    catch (error) {
        logger_1.default.fatal(`❌ Failed to set webhook: ${error}`);
        process.exit(1);
    }
}
startBot().catch(err => {
    logger_1.default.fatal(`❌ Bot failed to start: ${err}`);
    process.exit(1);
});
// ---------- Express Routes ----------
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Simple return page for after payment
app.get('/payment/return', (req, res) => {
    res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding-top: 50px;">
        <h2>✅ Payment processed</h2>
        <p>You can close this window and return to Telegram.</p>
      </body>
    </html>
  `);
});
// Webhook endpoints with logging middleware
app.post('/webhook/piprapay', (req, res, next) => {
    logger_1.default.info(`📥 PipraPay webhook received: ${JSON.stringify(req.body)}`);
    next();
}, piprapay_1.handlePipraPayWebhook);
app.post('/webhook/unipin', (req, res, next) => {
    logger_1.default.info(`📥 Unipin webhook received: ${JSON.stringify(req.body)}`);
    next();
}, unipin_1.handleUnipinWebhook);
const server = app.listen(PORT, () => {
    logger_1.default.info(`🌐 Express server running on port ${PORT}`);
});
// ---------- Graceful Shutdown ----------
async function shutdown(signal) {
    logger_1.default.info(`⚡ Received ${signal}, shutting down...`);
    try {
        await exports.bot.telegram.deleteWebhook();
        logger_1.default.info('✅ Webhook deleted successfully');
    }
    catch (error) {
        logger_1.default.warn(`⚠️ Failed to delete webhook: ${error}`);
    }
    exports.bot.stop(signal);
    server.close(() => {
        logger_1.default.info('✅ Server closed');
        process.exit(0);
    });
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
