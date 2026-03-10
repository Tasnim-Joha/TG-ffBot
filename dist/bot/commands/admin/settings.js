"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = getSetting;
exports.setSetting = setSetting;
exports.manageProviders = manageProviders;
exports.handleProviderCallback = handleProviderCallback;
exports.testEmail = testEmail;
exports.toggleMaintenance = toggleMaintenance;
const telegraf_1 = require("telegraf");
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const settings_1 = require("../../../config/settings");
const email_1 = require("../../../services/email");
const logger_1 = __importDefault(require("../../../logger"));
// Helper to safely parse integer from command arguments
function safeParseInt(value) {
    if (!value)
        return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
}
// /getsetting <key>
async function getSetting(ctx) {
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
        const value = settings_1.settings.get(key);
        if (value === undefined) {
            await ctx.reply(`Setting "${key}" not found.`);
            return;
        }
        await ctx.reply(`*${key}*: \`${JSON.stringify(value)}\``, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.error(error, 'Get setting error');
        await ctx.reply('❌ Failed to retrieve setting.');
    }
}
// /setsetting <key> <value>  (value must be valid JSON)
async function setSetting(ctx) {
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
    let parsedValue;
    try {
        parsedValue = JSON.parse(valueStr);
    }
    catch {
        await ctx.reply('Invalid JSON value. Please provide a valid JSON value (e.g., "value", 123, true, {"key":"value"}).');
        return;
    }
    try {
        await settings_1.settings.set(key, parsedValue);
        logger_1.default.info({ admin: ctx.from?.id, key, value: parsedValue }, 'Setting updated');
        // If SMTP settings changed, reset email transporter
        if (key.startsWith('smtp_')) {
            (0, email_1.resetTransporter)();
        }
        await ctx.reply(`✅ Setting "${key}" updated.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Set setting error');
        await ctx.reply('❌ Failed to update setting.');
    }
}
// /manageproviders – interactive menu for UID providers
async function manageProviders(ctx) {
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback('📋 List Providers', 'providers_list')],
        [telegraf_1.Markup.button.callback('➕ Add Provider', 'providers_add')],
        [telegraf_1.Markup.button.callback('❌ Close', 'providers_close')]
    ]);
    await ctx.reply('👤 *UID Provider Management*\nChoose an option:', {
        parse_mode: 'Markdown',
        ...keyboard
    });
}
// Callback query handlers for provider management
async function handleProviderCallback(ctx) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery))
        return;
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();
    if (data === 'providers_list') {
        await listProviders(ctx);
    }
    else if (data === 'providers_add') {
        await ctx.reply('⏳ Add provider wizard coming soon. For now, you can add providers manually via /setsetting (advanced).');
    }
    else if (data === 'providers_close') {
        await ctx.deleteMessage();
    }
    else if (data.startsWith('provider_toggle_')) {
        const parts = data.split('_');
        if (parts.length !== 3)
            return;
        const providerId = safeParseInt(parts[2]);
        if (providerId)
            await toggleProvider(ctx, providerId);
    }
    else if (data.startsWith('provider_delete_')) {
        const parts = data.split('_');
        if (parts.length !== 3)
            return;
        const providerId = safeParseInt(parts[2]);
        if (providerId)
            await deleteProvider(ctx, providerId);
    }
    else if (data === 'providers_back') {
        await manageProviders(ctx);
    }
}
async function listProviders(ctx) {
    try {
        const providers = await database_1.db.select()
            .from(schema_1.uidProviders)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.uidProviders.priority));
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
                telegraf_1.Markup.button.callback(p.isActive ? `🔴 Disable ${p.name}` : `🟢 Enable ${p.name}`, `provider_toggle_${p.id}`),
                telegraf_1.Markup.button.callback(`🗑️ Delete ${p.name}`, `provider_delete_${p.id}`)
            ]);
        }
        keyboardButtons.push([telegraf_1.Markup.button.callback('🔙 Back', 'providers_back')]);
        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...telegraf_1.Markup.inlineKeyboard(keyboardButtons)
        });
    }
    catch (error) {
        logger_1.default.error(error, 'List providers error');
        await ctx.reply('❌ Failed to fetch providers.');
    }
}
async function toggleProvider(ctx, providerId) {
    try {
        const [provider] = await database_1.db.select()
            .from(schema_1.uidProviders)
            .where((0, drizzle_orm_1.eq)(schema_1.uidProviders.id, providerId))
            .limit(1);
        if (!provider) {
            await ctx.reply('Provider not found.');
            return;
        }
        const newStatus = provider.isActive ? 0 : 1;
        await database_1.db.update(schema_1.uidProviders)
            .set({ isActive: newStatus })
            .where((0, drizzle_orm_1.eq)(schema_1.uidProviders.id, providerId));
        logger_1.default.info({ admin: ctx.from?.id, providerId, newStatus }, 'Provider toggled');
        await ctx.reply(`✅ Provider "${provider.name}" ${newStatus ? 'enabled' : 'disabled'}.`);
        await listProviders(ctx);
    }
    catch (error) {
        logger_1.default.error(error, 'Toggle provider error');
        await ctx.reply('❌ Failed to toggle provider.');
    }
}
async function deleteProvider(ctx, providerId) {
    try {
        const [provider] = await database_1.db.select()
            .from(schema_1.uidProviders)
            .where((0, drizzle_orm_1.eq)(schema_1.uidProviders.id, providerId))
            .limit(1);
        if (!provider) {
            await ctx.reply('Provider not found.');
            return;
        }
        await database_1.db.delete(schema_1.uidProviders).where((0, drizzle_orm_1.eq)(schema_1.uidProviders.id, providerId));
        logger_1.default.info({ admin: ctx.from?.id, providerId }, 'Provider deleted');
        await ctx.reply(`✅ Provider "${provider.name}" deleted.`);
        await listProviders(ctx);
    }
    catch (error) {
        logger_1.default.error(error, 'Delete provider error');
        await ctx.reply('❌ Failed to delete provider.');
    }
}
// /testemail <recipient_email> – test SMTP configuration
async function testEmail(ctx) {
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
        const { sendEmail } = await Promise.resolve().then(() => __importStar(require('../../../services/email')));
        await sendEmail(recipient, 'Test Email from Bot', '<p>This is a test email from your Telegram bot.</p>');
        await ctx.reply(`✅ Test email sent to ${recipient}.`);
    }
    catch (error) {
        logger_1.default.error(error, 'Test email error');
        await ctx.reply(`❌ Failed to send test email: ${error.message}`);
    }
}
// /maintenance – toggle maintenance mode
async function toggleMaintenance(ctx) {
    try {
        const current = settings_1.settings.get('maintenance_mode', false);
        const newValue = !current;
        await settings_1.settings.set('maintenance_mode', newValue);
        const status = newValue ? 'enabled' : 'disabled';
        await ctx.reply(`✅ Maintenance mode ${status}.`);
        logger_1.default.info({ admin: ctx.from?.id, maintenance: newValue }, 'Maintenance toggled');
    }
    catch (error) {
        logger_1.default.error(error, 'Toggle maintenance error');
        await ctx.reply('❌ Failed to toggle maintenance mode.');
    }
}
