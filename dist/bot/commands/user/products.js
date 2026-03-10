"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsCommand = productsCommand;
exports.handleProductCallback = handleProductCallback;
const telegraf_1 = require("telegraf");
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
async function productsCommand(ctx) {
    try {
        const cats = await database_1.db.select().from(schema_1.categories).where((0, drizzle_orm_1.eq)(schema_1.categories.status, 'active'));
        if (cats.length === 0) {
            await ctx.reply('No products available at the moment.');
            return;
        }
        const buttons = cats.map(cat => telegraf_1.Markup.button.callback(cat.name, `cat_${cat.id}`));
        const keyboard = telegraf_1.Markup.inlineKeyboard(buttons, { columns: 2 });
        await ctx.reply('📂 *Select a category:*', {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
    catch (error) {
        logger_1.default.error(error, 'Products command error');
        await ctx.reply('❌ Failed to load products.');
    }
}
// Callback handlers for product navigation
async function handleProductCallback(ctx) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery))
        return;
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();
    if (data.startsWith('cat_')) {
        const parts = data.split('_');
        if (parts.length !== 2)
            return;
        const catIdStr = parts[1];
        if (catIdStr === undefined)
            return;
        const categoryId = parseInt(catIdStr);
        if (isNaN(categoryId))
            return;
        await showProducts(ctx, categoryId);
    }
    else if (data.startsWith('prod_')) {
        const parts = data.split('_');
        if (parts.length !== 2)
            return;
        const prodIdStr = parts[1];
        if (prodIdStr === undefined)
            return;
        const productId = parseInt(prodIdStr);
        if (isNaN(productId))
            return;
        await showVariations(ctx, productId);
    }
    else if (data === 'products_back') {
        await productsCommand(ctx);
    }
}
async function showProducts(ctx, categoryId) {
    const prods = await database_1.db.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.categoryId, categoryId));
    if (prods.length === 0) {
        await ctx.editMessageText('No products in this category.');
        return;
    }
    const buttons = prods.map(p => telegraf_1.Markup.button.callback(p.name, `prod_${p.id}`));
    buttons.push(telegraf_1.Markup.button.callback('🔙 Back', 'products_back'));
    const keyboard = telegraf_1.Markup.inlineKeyboard(buttons, { columns: 2 });
    await ctx.editMessageText('📦 *Select a product:*', {
        parse_mode: 'Markdown',
        ...keyboard
    });
}
async function showVariations(ctx, productId) {
    const vars = await database_1.db.select().from(schema_1.variations).where((0, drizzle_orm_1.eq)(schema_1.variations.productId, productId));
    if (vars.length === 0) {
        await ctx.editMessageText('No variations for this product.');
        return;
    }
    let message = '*Variations:*\n\n';
    for (const v of vars) {
        message += `*${v.title}* (Code: \`${v.shortCode}\`)\n`;
        message += `Price: ৳${v.price}\n`;
        message += `Type: ${v.deliveryType}\n`;
        if (v.deliveryType === 'voucher') {
            // Count unused vouchers for this variation
            const [result] = await database_1.db.select({ stock: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.vouchers)
                .where((0, drizzle_orm_1.eq)(schema_1.vouchers.variationId, v.id));
            const stockCount = result?.stock || 0;
            message += `Stock: ${stockCount}\n`;
        }
        message += '\n';
    }
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('🔙 Back', 'products_back')
    ]);
    await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}
