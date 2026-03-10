// index.ts
import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { db } from './config/database';
import { settings } from './config/settings';
import { sql } from 'drizzle-orm';
import { setupBot } from './bot';
import logger from './logger';
import { handleUnipinWebhook } from './webhook/unipin';
import { handlePipraPayWebhook } from './webhook/piprapay';

const PORT = process.env.PORT || 3000;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;

if (!WEBHOOK_DOMAIN) {
  logger.fatal('❌ WEBHOOK_DOMAIN is not set in environment');
  process.exit(1);
}

// Export bot instance so it can be used in other files (e.g., services)
export const bot = new Telegraf(process.env.BOT_TOKEN!);

const app = express();
app.use(express.json());

// ---------- Start Bot ----------
async function startBot() {
  try {
    await db.execute(sql`SELECT 1`);
    logger.info('✅ Database connected');
  } catch (error) {
    logger.fatal(`❌ Database connection failed: ${error}`);
    process.exit(1);
  }

  try {
    await settings.load();
    logger.info('✅ Settings loaded');
  } catch (error) {
    logger.fatal(`❌ Failed to load settings: ${error}`);
    process.exit(1);
  }

  setupBot(bot);

  await bot.launch();
  logger.info('🤖 Bot started');

  const webhookUrl = `${WEBHOOK_DOMAIN}/webhook/${process.env.BOT_TOKEN}`;
  try {
    await bot.telegram.setWebhook(webhookUrl);
    logger.info(`✅ Webhook set to ${webhookUrl}`);
  } catch (error) {
    logger.fatal(`❌ Failed to set webhook: ${error}`);
    process.exit(1);
  }
}

startBot().catch(err => {
  logger.fatal(`❌ Bot failed to start: ${err}`);
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
  logger.info(`📥 PipraPay webhook received: ${JSON.stringify(req.body)}`);
  next();
}, handlePipraPayWebhook);

app.post('/webhook/unipin', (req, res, next) => {
  logger.info(`📥 Unipin webhook received: ${JSON.stringify(req.body)}`);
  next();
}, handleUnipinWebhook);

const server = app.listen(PORT, () => {
  logger.info(`🌐 Express server running on port ${PORT}`);
});

// ---------- Graceful Shutdown ----------
async function shutdown(signal: string) {
  logger.info(`⚡ Received ${signal}, shutting down...`);
  try {
    await bot.telegram.deleteWebhook();
    logger.info('✅ Webhook deleted successfully');
  } catch (error) {
    logger.warn(`⚠️ Failed to delete webhook: ${error}`);
  }
  bot.stop(signal);
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));