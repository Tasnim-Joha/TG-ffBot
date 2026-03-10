import { Context } from 'telegraf';
import { handleProviderCallback } from '../commands/admin/settings';

export async function handleCallbackQuery(ctx: Context) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data;

  // Route to appropriate handler based on prefix
  if (data.startsWith('providers_') || data.startsWith('provider_')) {
    await handleProviderCallback(ctx);
  } else {
    // other callback types can be added here
    await ctx.answerCbQuery();
    await ctx.reply('Unknown callback.');
  }
}