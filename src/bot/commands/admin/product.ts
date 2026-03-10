import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { products, categories } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import logger from '../../../logger';

function safeParseInt(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

// /addproduct <category_id> <name> [description]
export async function addProduct(ctx: Context) {
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
  const description: string | null = descriptionText || null;

  try {
    // Check if category exists
    const [cat] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    if (!cat) {
      await ctx.reply('Category not found.');
      return;
    }

    await db.insert(products).values({
      categoryId,
      name,
      description,
      status: 'active',
    });
    logger.info({ admin: ctx.from?.id, name, categoryId }, 'Product added');
    await ctx.reply(`✅ Product "${name}" created.`);
  } catch (error) {
    logger.error(error, 'Add product error');
    await ctx.reply('❌ Failed to create product.');
  }
}

// /editproduct <id> <name> [description]
export async function editProduct(ctx: Context) {
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
  const description: string | null = descriptionText || null;

  try {
    await db.update(products)
      .set({ name, description })
      .where(eq(products.id, id));
    logger.info({ admin: ctx.from?.id, id, name }, 'Product edited');
    await ctx.reply(`✅ Product updated.`);
  } catch (error) {
    logger.error(error, 'Edit product error');
    await ctx.reply('❌ Failed to update product.');
  }
}

// /deleteproduct <id>
export async function deleteProduct(ctx: Context) {
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
    await db.delete(products).where(eq(products.id, id));
    logger.info({ admin: ctx.from?.id, id }, 'Product deleted');
    await ctx.reply(`✅ Product deleted.`);
  } catch (error) {
    logger.error(error, 'Delete product error');
    await ctx.reply('❌ Failed to delete product.');
  }
}