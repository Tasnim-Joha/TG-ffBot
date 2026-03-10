import { Context, Markup } from 'telegraf';
import { db } from '../../../config/database';
import { uidProviders } from '../../../models/schema';
import { eq, desc } from 'drizzle-orm';
import { settings } from '../../../config/settings';
import { resetTransporter } from '../../../services/email';
import logger from '../../../logger';

// Helper to safely parse integer from command arguments
function safeParseInt(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

// /getsetting <key>
export async function getSetting(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the setting key.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1) {
    await ctx.reply('Usage: /getsetting <key>');
    return;
  }
  const key = args[0];
  if (!key) {
    await ctx.reply('Key cannot be empty.');
    return;
  }

  try {
    const value = settings.get(key);
    if (value === undefined) {
      await ctx.reply(`Setting "${key}" not found.`);
      return;
    }
    await ctx.reply(`*${key}*: \`${JSON.stringify(value)}\``, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'Get setting error');
    await ctx.reply('❌ Failed to retrieve setting.');
  }
}

// /setsetting <key> <value>  (value must be valid JSON)
export async function setSetting(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the setting key and value.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length < 2) {
    await ctx.reply('Usage: /setsetting <key> <value> (value as JSON)');
    return;
  }
  const key = args[0];
  if (!key) {
    await ctx.reply('Key cannot be empty.');
    return;
  }
  const valueStr = args.slice(1).join(' ');
  let parsedValue: any;
  try {
    parsedValue = JSON.parse(valueStr);
  } catch {
    await ctx.reply('Invalid JSON value. Please provide a valid JSON value (e.g., "value", 123, true, {"key":"value"}).');
    return;
  }

  try {
    await settings.set(key, parsedValue);
    logger.info({ admin: ctx.from?.id, key, value: parsedValue }, 'Setting updated');

    // If SMTP settings changed, reset email transporter
    if (key.startsWith('smtp_')) {
      resetTransporter();
    }

    await ctx.reply(`✅ Setting "${key}" updated.`);
  } catch (error) {
    logger.error(error, 'Set setting error');
    await ctx.reply('❌ Failed to update setting.');
  }
}

// /manageproviders – interactive menu for UID providers
export async function manageProviders(ctx: Context) {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 List Providers', 'providers_list')],
    [Markup.button.callback('➕ Add Provider', 'providers_add')],
    [Markup.button.callback('❌ Close', 'providers_close')]
  ]);

  await ctx.reply('👤 *UID Provider Management*\nChoose an option:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

// Callback query handlers for provider management
export async function handleProviderCallback(ctx: Context) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;
  await ctx.answerCbQuery();

  if (data === 'providers_list') {
    await listProviders(ctx);
  } else if (data === 'providers_add') {
    await ctx.reply('⏳ Add provider wizard coming soon. For now, you can add providers manually via /setsetting (advanced).');
  } else if (data === 'providers_close') {
    await ctx.deleteMessage();
  } else if (data.startsWith('provider_toggle_')) {
    const parts = data.split('_');
    if (parts.length !== 3) return;
    const providerId = safeParseInt(parts[2]);
    if (providerId) await toggleProvider(ctx, providerId);
  } else if (data.startsWith('provider_delete_')) {
    const parts = data.split('_');
    if (parts.length !== 3) return;
    const providerId = safeParseInt(parts[2]);
    if (providerId) await deleteProvider(ctx, providerId);
  } else if (data === 'providers_back') {
    await manageProviders(ctx);
  }
}

async function listProviders(ctx: Context) {
  try {
    const providers = await db.select()
      .from(uidProviders)
      .orderBy(desc(uidProviders.priority));

    if (providers.length === 0) {
      await ctx.reply('No providers found. Use /setsetting to add them manually.');
      return;
    }

    let message = '*UID Providers:*\n\n';
    const keyboardButtons = [];

    for (const p of providers) {
      const status = p.isActive ? '✅ Active' : '❌ Inactive';
      message += `*${p.name}* (${p.providerKey})\n`;
      message += `URL: ${p.baseUrl || 'N/A'}\n`;
      message += `Priority: ${p.priority} | Status: ${status}\n\n`;

      keyboardButtons.push([
        Markup.button.callback(
          p.isActive ? `🔴 Disable ${p.name}` : `🟢 Enable ${p.name}`,
          `provider_toggle_${p.id}`
        ),
        Markup.button.callback(`🗑️ Delete ${p.name}`, `provider_delete_${p.id}`)
      ]);
    }

    keyboardButtons.push([Markup.button.callback('🔙 Back', 'providers_back')]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboardButtons)
    });
  } catch (error) {
    logger.error(error, 'List providers error');
    await ctx.reply('❌ Failed to fetch providers.');
  }
}

async function toggleProvider(ctx: Context, providerId: number) {
  try {
    const [provider] = await db.select()
      .from(uidProviders)
      .where(eq(uidProviders.id, providerId))
      .limit(1);

    if (!provider) {
      await ctx.reply('Provider not found.');
      return;
    }

    const newStatus = provider.isActive ? 0 : 1;
    await db.update(uidProviders)
      .set({ isActive: newStatus })
      .where(eq(uidProviders.id, providerId));

    logger.info({ admin: ctx.from?.id, providerId, newStatus }, 'Provider toggled');
    await ctx.reply(`✅ Provider "${provider.name}" ${newStatus ? 'enabled' : 'disabled'}.`);
    await listProviders(ctx);
  } catch (error) {
    logger.error(error, 'Toggle provider error');
    await ctx.reply('❌ Failed to toggle provider.');
  }
}

async function deleteProvider(ctx: Context, providerId: number) {
  try {
    const [provider] = await db.select()
      .from(uidProviders)
      .where(eq(uidProviders.id, providerId))
      .limit(1);

    if (!provider) {
      await ctx.reply('Provider not found.');
      return;
    }

    await db.delete(uidProviders).where(eq(uidProviders.id, providerId));
    logger.info({ admin: ctx.from?.id, providerId }, 'Provider deleted');
    await ctx.reply(`✅ Provider "${provider.name}" deleted.`);
    await listProviders(ctx);
  } catch (error) {
    logger.error(error, 'Delete provider error');
    await ctx.reply('❌ Failed to delete provider.');
  }
}

// /testemail <recipient_email> – test SMTP configuration
export async function testEmail(ctx: Context) {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the recipient email.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length !== 1) {
    await ctx.reply('Usage: /testemail <recipient_email>');
    return;
  }
  const recipient = args[0];
  if (!recipient) {
    await ctx.reply('Recipient email cannot be empty.');
    return;
  }

  try {
    const { sendEmail } = await import('../../../services/email');
    await sendEmail(recipient, 'Test Email from Bot', '<p>This is a test email from your Telegram bot.</p>');
    await ctx.reply(`✅ Test email sent to ${recipient}.`);
  } catch (error: any) {
    logger.error(error, 'Test email error');
    await ctx.reply(`❌ Failed to send test email: ${error.message}`);
  }
}

// /maintenance – toggle maintenance mode
export async function toggleMaintenance(ctx: Context) {
  try {
    const current = settings.get<boolean>('maintenance_mode', false);
    const newValue = !current;
    await settings.set('maintenance_mode', newValue);
    const status = newValue ? 'enabled' : 'disabled';
    await ctx.reply(`✅ Maintenance mode ${status}.`);
    logger.info({ admin: ctx.from?.id, maintenance: newValue }, 'Maintenance toggled');
  } catch (error) {
    logger.error(error, 'Toggle maintenance error');
    await ctx.reply('❌ Failed to toggle maintenance mode.');
  }
}