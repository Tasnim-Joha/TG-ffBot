"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addProduct = addProduct;
exports.editProduct = editProduct;
exports.deleteProduct = deleteProduct;
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
// /addproduct <category_id> <name> [description]
async function addProduct(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the product details.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length < 2) {
        await ctx.reply('Usage: /addproduct <category_id> <name> [description]');
        return;
    }
    const categoryId = safeParseInt(args[0]);
    if (!categoryId) {
        await ctx.reply('Invalid category ID.');
        return;
    }
    const name = args[1];
    if (!name) {
        await ctx.reply('Product name cannot be empty.');
        return;
    }
    const descriptionText = args.slice(2).join(' ').trim();
    const description = descriptionText || null;
    try {
        // Check if category exists
        const [cat] = await database_1.db.select().from(schema_1.categories).where((0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)).limit(1);
        if (!cat) {
            await ctx.reply('Category not found.');
            return;
        }
        await database_1.db.insert(schema_1.products).values({
            categoryId,
            name,
            description,
            status: 'active',
        });
        logger_1.default.info({ admin: ctx.from?.id, name, categoryId }, 'Product added');
        await ctx.reply(`✅ Product "${name}" created.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Add product error');
        await ctx.reply('❌ Failed to create product.');
    }
}
// /editproduct <id> <name> [description]
async function editProduct(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the product ID and new name.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length < 2) {
        await ctx.reply('Usage: /editproduct <id> <name> [description]');
        return;
    }
    const id = safeParseInt(args[0]);
    if (!id) {
        await ctx.reply('Invalid product ID.');
        return;
    }
    const name = args[1];
    if (!name) {
        await ctx.reply('Product name cannot be empty.');
        return;
    }
    const descriptionText = args.slice(2).join(' ').trim();
    const description = descriptionText || null;
    try {
        await database_1.db.update(schema_1.products)
            .set({ name, description })
            .where((0, drizzle_orm_1.eq)(schema_1.products.id, id));
        logger_1.default.info({ admin: ctx.from?.id, id, name }, 'Product edited');
        await ctx.reply(`✅ Product updated.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Edit product error');
        await ctx.reply('❌ Failed to update product.');
    }
}
// /deleteproduct <id>
async function deleteProduct(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the product ID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1) {
        await ctx.reply('Usage: /deleteproduct <id>');
        return;
    }
    const id = safeParseInt(args[0]);
    if (!id) {
        await ctx.reply('Invalid product ID.');
        return;
    }
    try {
        await database_1.db.delete(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, id));
        logger_1.default.info({ admin: ctx.from?.id, id }, 'Product deleted');
        await ctx.reply(`✅ Product deleted.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Delete product error');
        await ctx.reply('❌ Failed to delete product.');
    }
}
