"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStock = addStock;
exports.bulkAddStock = bulkAddStock;
exports.listStocks = listStocks;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
function safeParseInt(value) {
    if (!value)
        return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
}
// /addstock <variation_id> <code>
async function addStock(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the variation ID and code.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 2) {
        await ctx.reply('Usage: /addstock <variation_id> <code>');
        return;
    }
    const variationId = safeParseInt(args[0]);
    if (!variationId) {
        await ctx.reply('Invalid variation ID.');
        return;
    }
    const code = args[1];
    if (!code) {
        await ctx.reply('Code cannot be empty.');
        return;
    }
    try {
        // Check if variation exists
        const [variation] = await database_1.db.select().from(schema_1.variations).where((0, drizzle_orm_1.eq)(schema_1.variations.id, variationId)).limit(1);
        if (!variation) {
            await ctx.reply('Variation not found.');
            return;
        }
        // Check if code already exists
        const [existing] = await database_1.db.select().from(schema_1.vouchers).where((0, drizzle_orm_1.eq)(schema_1.vouchers.code, code)).limit(1);
        if (existing) {
            await ctx.reply('A voucher with this code already exists.');
            return;
        }
        await database_1.db.insert(schema_1.vouchers).values({
            variationId,
            code,
            isUsed: 0,
        });
        logger_1.default.info({ admin: ctx.from?.id, variationId, code }, 'Voucher code added');
        await ctx.reply(`✅ Voucher code added.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Add stock error');
        await ctx.reply('❌ Failed to add voucher code.');
    }
}
// /bulkaddstock – expects a file attachment (text file with one code per line)
async function bulkAddStock(ctx) {
    const message = ctx.message;
    if (!message || !('document' in message)) {
        await ctx.reply('Please upload a text file with one voucher code per line.');
        return;
    }
    // The first line should be the variation ID (or we could ask separately)
    // We'll require the variation ID as first argument in the caption or text
    const caption = message.caption || '';
    const args = caption.split(' ').slice(1);
    if (!args || args.length !== 1) {
        await ctx.reply('Usage: /bulkaddstock <variation_id> (with a file attached)');
        return;
    }
    const variationId = safeParseInt(args[0]);
    if (!variationId) {
        await ctx.reply('Invalid variation ID.');
        return;
    }
    const document = message.document;
    const fileId = document.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const fileUrl = fileLink.href;
    // Download file
    try {
        const response = await fetch(fileUrl);
        const text = await response.text();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        // Check if variation exists
        const [variation] = await database_1.db.select().from(schema_1.variations).where((0, drizzle_orm_1.eq)(schema_1.variations.id, variationId)).limit(1);
        if (!variation) {
            await ctx.reply('Variation not found.');
            return;
        }
        let added = 0;
        let skipped = 0;
        for (const code of lines) {
            // Check if code already exists
            const [existing] = await database_1.db.select().from(schema_1.vouchers).where((0, drizzle_orm_1.eq)(schema_1.vouchers.code, code)).limit(1);
            if (existing) {
                skipped++;
                continue;
            }
            await database_1.db.insert(schema_1.vouchers).values({
                variationId,
                code,
                isUsed: 0,
            });
            added++;
        }
        logger_1.default.info({ admin: ctx.from?.id, variationId, added, skipped }, 'Bulk stock added');
        await ctx.reply(`✅ Bulk add complete. Added: ${added}, Skipped (duplicates): ${skipped}`);
    }
    catch (error) {
        logger_1.default.error(error, 'Bulk add stock error');
        await ctx.reply('❌ Failed to process file.');
    }
}
// /stocks – list all variations with stock counts
async function listStocks(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message to list stocks.');
        return;
    }
    try {
        const allVariations = await database_1.db.select({
            id: schema_1.variations.id,
            title: schema_1.variations.title,
            shortCode: schema_1.variations.shortCode,
            deliveryType: schema_1.variations.deliveryType,
            stock: schema_1.variations.stock,
        }).from(schema_1.variations);
        if (allVariations.length === 0) {
            await ctx.reply('No variations found.');
            return;
        }
        let message = '📊 *Stock Levels:*\n\n';
        for (const v of allVariations) {
            // Count unused vouchers for voucher-type variations
            let stockDisplay = v.stock;
            if (v.deliveryType === 'voucher') {
                const [result] = await database_1.db.select({ count: (0, drizzle_orm_1.count)() })
                    .from(schema_1.vouchers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.vouchers.variationId, v.id), (0, drizzle_orm_1.eq)(schema_1.vouchers.isUsed, 0)));
                stockDisplay = result?.count || 0;
            }
            message += `*${v.title}* (${v.shortCode})\n`;
            message += `Type: ${v.deliveryType}\n`;
            message += `Stock: ${stockDisplay}\n\n`;
        }
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.error(error, 'List stocks error');
        await ctx.reply('❌ Failed to fetch stock levels.');
    }
}
