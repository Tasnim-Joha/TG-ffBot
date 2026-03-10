import { Context, Markup } from 'telegraf';
import { db } from '../../../config/database';
import { categories, products, variations, vouchers } from '../../../models/schema';
import { eq, sql } from 'drizzle-orm';
import logger from '../../../logger';

export async function productsCommand(ctx: Context) {
  try {
    const cats = await db.select().from(categories).where(eq(categories.status, 'active'));
    if (cats.length === 0) {
      await ctx.reply('No products available at the moment.');
      return;
    }

    const buttons = cats.map(cat => 
      Markup.button.callback(cat.name, `cat_${cat.id}`)
    );
    const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 });

    await ctx.reply('📂 *Select a category:*', {
      parse_mode: 'Markdown',
      ...keyboard
    });
  } catch (error) {
    logger.error(error, 'Products command error');
    await ctx.reply('❌ Failed to load products.');
  }
}

// Callback handlers for product navigation
export async function handleProductCallback(ctx: Context) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;
  await ctx.answerCbQuery();

  if (data.startsWith('cat_')) {
    const parts = data.split('_');
    if (parts.length !== 2) return;
    const catIdStr = parts[1];
    if (catIdStr === undefined) return;
    const categoryId = parseInt(catIdStr);
    if (isNaN(categoryId)) return;
    await showProducts(ctx, categoryId);
  } else if (data.startsWith('prod_')) {
    const parts = data.split('_');
    if (parts.length !== 2) return;
    const prodIdStr = parts[1];
    if (prodIdStr === undefined) return;
    const productId = parseInt(prodIdStr);
    if (isNaN(productId)) return;
    await showVariations(ctx, productId);
  } else if (data === 'products_back') {
    await productsCommand(ctx);
  }
}

async function showProducts(ctx: Context, categoryId: number) {
  const prods = await db.select().from(products).where(eq(products.categoryId, categoryId));
  if (prods.length === 0) {
    await ctx.editMessageText('No products in this category.');
    return;
  }

  const buttons = prods.map(p => 
    Markup.button.callback(p.name, `prod_${p.id}`)
  );
  buttons.push(Markup.button.callback('🔙 Back', 'products_back'));
  const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 });

  await ctx.editMessageText('📦 *Select a product:*', {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

async function showVariations(ctx: Context, productId: number) {
  const vars = await db.select().from(variations).where(eq(variations.productId, productId));
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
      const [result] = await db.select({ stock: sql<number>`count(*)` })
        .from(vouchers)
        .where(eq(vouchers.variationId, v.id));
      const stockCount = result?.stock || 0;
      message += `Stock: ${stockCount}\n`;
    }
    message += '\n';
  }

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('🔙 Back', 'products_back')
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}