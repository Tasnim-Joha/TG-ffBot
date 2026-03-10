"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCategory = addCategory;
exports.editCategory = editCategory;
exports.deleteCategory = deleteCategory;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
// Helper to parse integer safely
function safeParseInt(value) {
    if (!value)
        return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
}
// /addcategory <name> [description]
async function addCategory(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the category name.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length < 1) {
        await ctx.reply('Usage: /addcategory <name> [description]');
        return;
    }
    const name = args[0];
    if (!name) {
        await ctx.reply('Category name cannot be empty.');
        return;
    }
    // Join remaining args for description; if none, set to null
    const descriptionText = args.slice(1).join(' ').trim();
    const description = descriptionText || null;
    try {
        await database_1.db.insert(schema_1.categories).values({
            name,
            description,
            status: 'active',
        });
        logger_1.default.info({ admin: ctx.from?.id, name }, 'Category added');
        await ctx.reply(`✅ Category "${name}" created.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Add category error');
        await ctx.reply('❌ Failed to create category.');
    }
}
// /editcategory <id> <new_name> [new_description]
async function editCategory(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the category ID and new name.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length < 2) {
        await ctx.reply('Usage: /editcategory <id> <new_name> [new_description]');
        return;
    }
    const id = safeParseInt(args[0]);
    if (!id) {
        await ctx.reply('Invalid category ID.');
        return;
    }
    const name = args[1];
    if (!name) {
        await ctx.reply('Category name cannot be empty.');
        return;
    }
    const descriptionText = args.slice(2).join(' ').trim();
    const description = descriptionText || null;
    try {
        await database_1.db.update(schema_1.categories)
            .set({ name, description })
            .where((0, drizzle_orm_1.eq)(schema_1.categories.id, id));
        logger_1.default.info({ admin: ctx.from?.id, id, name }, 'Category edited');
        await ctx.reply(`✅ Category updated.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Edit category error');
        await ctx.reply('❌ Failed to update category.');
    }
}
// /deletecategory <id>
async function deleteCategory(ctx) {
    // Check if the message is a text message
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message with the category ID.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    if (!args || args.length !== 1) {
        await ctx.reply('Usage: /deletecategory <id>');
        return;
    }
    const id = safeParseInt(args[0]);
    if (!id) {
        await ctx.reply('Invalid category ID.');
        return;
    }
    try {
        // Check if category has products
        const productsInCat = await database_1.db.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.categoryId, id));
        if (productsInCat.length > 0) {
            await ctx.reply('❌ Cannot delete category with products. Delete products first.');
            return;
        }
        await database_1.db.delete(schema_1.categories).where((0, drizzle_orm_1.eq)(schema_1.categories.id, id));
        logger_1.default.info({ admin: ctx.from?.id, id }, 'Category deleted');
        await ctx.reply(`✅ Category deleted.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Delete category error');
        await ctx.reply('❌ Failed to delete category.');
    }
}
