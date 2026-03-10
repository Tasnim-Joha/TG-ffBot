import { Context } from 'telegraf';
import { settings } from '../../../config/settings';
import logger from '../../../logger';

// /getconfig [key] – view all settings or a specific one (raw JSON)
export async function getConfig(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message.');
    return;
  }

  const text = ctx.message.text;
  const args = text.split(' ').slice(1);
  const key = args[0];

  try {
    if (key) {
      const value = settings.get(key);
      if (value === undefined) {
        await ctx.reply(`Setting "${key}" not found.`);
        return;
      }
      await ctx.reply(`*${key}*:\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('To view a specific setting, use /getconfig <key>.');
    }
  } catch (error) {
    logger.error(error, 'Get config error');
    await ctx.reply('❌ Failed to retrieve configuration.');
  }
}

// /setconfig <key> <value> – set a raw JSON value
export async function setConfig(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the key and value.');
    return;
  }

  const text = ctx.message.text;
  const args = text.split(' ').slice(1);
  if (!args || args.length < 2) {
    await ctx.reply('Usage: /setconfig <key> <value> (value as JSON)');
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
    await ctx.reply('Invalid JSON value.');
    return;
  }

  try {
    await settings.set(key, parsedValue);
    logger.info({ superadmin: ctx.from?.id, key, value: parsedValue }, 'Config updated');
    await ctx.reply(`✅ Configuration "${key}" updated.`);
  } catch (error) {
    logger.error(error, 'Set config error');
    await ctx.reply('❌ Failed to update configuration.');
  }
}