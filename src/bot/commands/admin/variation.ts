import { Context } from 'telegraf';
import { db } from '../../../config/database';
import { variations, products } from '../../../models/schema';
import { eq } from 'drizzle-orm';
import logger from '../../../logger';

function safeParseInt(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

// /addvariation <product_id> <title> <short_code> <price> <delivery_type> [region] [unipin_code]
export async function addVariation(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the variation details.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length < 5) {
    await ctx.reply('Usage: /addvariation <product_id> <title> <short_code> <price> <delivery_type> [region] [unipin_code]');
    return;
  }

  const productId = safeParseInt(args[0]);
  if (!productId) {
    await ctx.reply('Invalid product ID.');
    return;
  }

  const title = args[1];
  if (!title) {
    await ctx.reply('Title cannot be empty.');
    return;
  }

  const shortCode = args[2];
  if (!shortCode) {
    await ctx.reply('Short code cannot be empty.');
    return;
  }

  const priceArg = args[3];
  if (!priceArg) {
    await ctx.reply('Price is required.');
    return;
  }
  const price = parseFloat(priceArg);
  if (isNaN(price) || price <= 0) {
    await ctx.reply('Invalid price (must be a positive number).');
    return;
  }

  const deliveryType = args[4] as 'voucher' | 'unipin' | 'manual';
  if (!['voucher', 'unipin', 'manual'].includes(deliveryType)) {
    await ctx.reply('Delivery type must be voucher, unipin, or manual.');
    return;
  }

  const region = args[5] || null;
  const unipinCode = args[6] || null;

  try {
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      await ctx.reply('Product not found.');
      return;
    }

    const [existing] = await db.select().from(variations).where(eq(variations.shortCode, shortCode)).limit(1);
    if (existing) {
      await ctx.reply('Short code already exists. Please choose another.');
      return;
    }

    await db.insert(variations).values({
      productId,
      title,
      shortCode,
      price: price.toString(),
      deliveryType,
      region,
      unipinCode,
      stock: 0,
      status: 'active',
    });

    logger.info({ admin: ctx.from?.id, productId, title, shortCode }, 'Variation added');
    await ctx.reply(`✅ Variation "${title}" added with code "${shortCode}".`);
  } catch (error) {
    logger.error(error, 'Add variation error');
    await ctx.reply('❌ Failed to add variation.');
  }
}

// /editvariation <id> <field> <value>
export async function editVariation(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the variation ID and field to edit.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length < 3) {
    await ctx.reply('Usage: /editvariation <id> <field> <value>');
    return;
  }

  const id = safeParseInt(args[0]);
  if (!id) {
    await ctx.reply('Invalid variation ID.');
    return;
  }

  const field = args[1];
  if (!field) {
    await ctx.reply('Field name is required.');
    return;
  }

  const value = args.slice(2).join(' ');

  const allowedFields = ['title', 'shortCode', 'price', 'deliveryType', 'region', 'unipinCode', 'stock', 'status'];
  if (!allowedFields.includes(field)) {
    await ctx.reply(`Invalid field. Allowed fields: ${allowedFields.join(', ')}`);
    return;
  }

  try {
    const [variation] = await db.select().from(variations).where(eq(variations.id, id)).limit(1);
    if (!variation) {
      await ctx.reply('Variation not found.');
      return;
    }

    // Type-specific validation
    let updateValue: any = value;
    if (field === 'price') {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        await ctx.reply('Price must be a positive number.');
        return;
      }
      updateValue = num.toString();
    } else if (field === 'stock') {
      const num = parseInt(value);
      if (isNaN(num) || num < 0) {
        await ctx.reply('Stock must be a non-negative integer.');
        return;
      }
      updateValue = num;
    } else if (field === 'shortCode') {
      const [existing] = await db.select().from(variations).where(eq(variations.shortCode, value)).limit(1);
      if (existing && existing.id !== id) {
        await ctx.reply('Short code already exists. Please choose another.');
        return;
      }
    }

    await db.update(variations)
      .set({ [field]: updateValue })
      .where(eq(variations.id, id));

    logger.info({ admin: ctx.from?.id, variationId: id, field, value }, 'Variation edited');
    await ctx.reply(`✅ Variation updated.`);
  } catch (error) {
    logger.error(error, 'Edit variation error');
    await ctx.reply('❌ Failed to edit variation.');
  }
}

// /deletevariation <id>
export async function deleteVariation(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the variation ID.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1) {
    await ctx.reply('Usage: /deletevariation <id>');
    return;
  }

  const id = safeParseInt(args[0]);
  if (!id) {
    await ctx.reply('Invalid variation ID.');
    return;
  }

  try {
    const [variation] = await db.select().from(variations).where(eq(variations.id, id)).limit(1);
    if (!variation) {
      await ctx.reply('Variation not found.');
      return;
    }

    await db.delete(variations).where(eq(variations.id, id));
    logger.info({ admin: ctx.from?.id, variationId: id, title: variation.title }, 'Variation deleted');
    await ctx.reply(`✅ Variation "${variation.title}" deleted.`);
  } catch (error) {
    logger.error(error, 'Delete variation error');
    await ctx.reply('❌ Failed to delete variation.');
  }
}

// /listvariations [product_id] – list all variations, optionally filtered by product
export async function listVariations(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with optional product ID.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  const productId = args[0] ? safeParseInt(args[0]) : null;

  try {
    let query = db.select({
      id: variations.id,
      productId: variations.productId,
      title: variations.title,
      shortCode: variations.shortCode,
      price: variations.price,
      deliveryType: variations.deliveryType,
      region: variations.region,
      unipinCode: variations.unipinCode,
      stock: variations.stock,
      status: variations.status,
    }).from(variations);

    if (productId) {
      query = query.where(eq(variations.productId, productId)) as typeof query;
    }

    const vars = await query;

    if (vars.length === 0) {
      await ctx.reply(productId ? 'No variations for this product.' : 'No variations found.');
      return;
    }

    let message = '📋 *Variations:*\n\n';
    for (const v of vars) {
      message += `*ID ${v.id}* | Code: \`${v.shortCode}\`\n`;
      message += `Title: ${v.title}\n`;
      message += `Price: ৳${v.price}\n`;
      message += `Type: ${v.deliveryType}\n`;
      if (v.region) message += `Region: ${v.region}\n`;
      if (v.unipinCode) message += `UniPin: \`${v.unipinCode}\`\n`;
      message += `Stock: ${v.stock}\n`;
      message += `Status: ${v.status}\n\n`;
    }
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'List variations error');
    await ctx.reply('❌ Failed to fetch variations.');
  }
}