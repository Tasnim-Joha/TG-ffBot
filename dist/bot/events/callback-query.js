"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallbackQuery = handleCallbackQuery;
const settings_1 = require("../commands/admin/settings");
async function handleCallbackQuery(ctx) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery))
        return;
    const data = ctx.callbackQuery.data;
    // Route to appropriate handler based on prefix
    if (data.startsWith('providers_') || data.startsWith('provider_')) {
        await (0, settings_1.handleProviderCallback)(ctx);
    }
    else {
        // other callback types can be added here
        await ctx.answerCbQuery();
        await ctx.reply('Unknown callback.');
    }
}
