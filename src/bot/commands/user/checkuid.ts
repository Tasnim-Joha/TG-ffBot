import { Context } from 'telegraf';
import { checkUid } from '../../../services/uid-checker';
import logger from '../../../logger';

export async function checkuidCommand(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with the UID.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length === 0) {
    await ctx.reply('Usage: /checkuid <uid> [region]');
    return;
  }

  const uid = args[0];
  if (!uid) {
    await ctx.reply('UID is required.');
    return;
  }

  const region = args[1] || 'SG'; // optional region, default SG

  if (!/^\d+$/.test(uid)) {
    await ctx.reply('Invalid UID. Must contain only numbers.');
    return;
  }

  try {
    await ctx.reply('🔍 Checking UID, please wait...');
    const playerInfo = await checkUid(uid, region);
    await ctx.reply(
      `✅ Player found!\n\n` +
      `Name: ${playerInfo.name}\n` +
      `Level: ${playerInfo.level || 'N/A'}\n` +
      `Region: ${playerInfo.region || region}`
    );
  } catch (error: any) {
    logger.error({ error, uid, region }, 'UID check failed');
    await ctx.reply(`❌ Failed to check UID: ${error.message}`);
  }
}