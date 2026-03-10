"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBot = setupBot;
const admin_1 = require("./middleware/admin");
const superadmin_1 = require("./middleware/superadmin");
const auth_1 = require("./middleware/auth");
const authHelper_1 = require("./utils/authHelper");
const settings_1 = require("../config/settings");
// Import user commands
const start_1 = require("./commands/user/start");
const register_1 = require("./commands/user/register");
const login_1 = require("./commands/user/login");
const verify_1 = require("./commands/user/verify");
const logout_1 = require("./commands/user/logout");
const setphone_1 = require("./commands/user/setphone");
const profile_1 = require("./commands/user/profile");
const balance_1 = require("./commands/user/balance");
const deposit_1 = require("./commands/user/deposit");
const orders_1 = require("./commands/user/orders");
const cancelorder_1 = require("./commands/user/cancelorder");
const products_1 = require("./commands/user/products");
const buy_1 = require("./commands/user/buy");
const redeem_1 = require("./commands/user/redeem");
const checkuid_1 = require("./commands/user/checkuid");
const calculator_1 = require("./commands/user/calculator");
const support_1 = require("./commands/user/support");
const faq_1 = require("./commands/user/faq");
const changename_1 = require("./commands/user/changename");
const help_1 = require("./commands/user/help");
// Import admin commands
const category_1 = require("./commands/admin/category");
const product_1 = require("./commands/admin/product");
const variation_1 = require("./commands/admin/variation");
const stock_1 = require("./commands/admin/stock");
const orders_2 = require("./commands/admin/orders");
const users_1 = require("./commands/admin/users");
const broadcast_1 = require("./commands/admin/broadcast");
const stats_1 = require("./commands/admin/stats");
const settings_2 = require("./commands/admin/settings");
// NEW: PipraPay admin commands
const deposits_1 = require("./commands/admin/deposits");
const verify_2 = require("./commands/admin/verify");
const refunddeposit_1 = require("./commands/admin/refunddeposit");
// Import superadmin commands
const superadmin_2 = require("./commands/superadmin");
// Import callback query handler
const callback_query_1 = require("./events/callback-query");
function setupBot(bot) {
    // ---------- Slash Commands (standard Telegram commands) ----------
    // User commands (public)
    bot.start(start_1.startCommand);
    bot.command('register', register_1.registerCommand);
    bot.command('login', login_1.loginCommand);
    bot.command('verify', verify_1.verifyCommand);
    bot.command('logout', auth_1.authenticate, logout_1.logoutCommand);
    bot.command('setphone', auth_1.authenticate, setphone_1.setPhoneCommand);
    bot.command('profile', auth_1.authenticate, profile_1.profileCommand);
    bot.command('balance', auth_1.authenticate, balance_1.balanceCommand);
    bot.command('deposit', auth_1.authenticate, deposit_1.depositCommand);
    bot.command('orders', auth_1.authenticate, orders_1.ordersCommand);
    bot.command('products', products_1.productsCommand);
    bot.command('buy', auth_1.authenticate, buy_1.buyCommand);
    bot.command('cancelorder', auth_1.authenticate, cancelorder_1.cancelOrderCommand);
    bot.command('tp', auth_1.authenticate, buy_1.buyCommand); // alias
    bot.command('redeem', auth_1.authenticate, redeem_1.redeemCommand);
    bot.command('checkuid', checkuid_1.checkuidCommand);
    bot.command('calc', calculator_1.calculatorCommand);
    bot.command('calculator', calculator_1.calculatorCommand);
    bot.command('support', auth_1.authenticate, support_1.supportCommand);
    bot.command('faq', faq_1.faqCommand);
    bot.command('changename', auth_1.authenticate, changename_1.changenameCommand);
    bot.command('help', help_1.helpCommand);
    // ---------- Admin Commands (protected with admin check) ----------
    bot.command('addcategory', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, category_1.addCategory)(ctx);
    });
    bot.command('editcategory', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, category_1.editCategory)(ctx);
    });
    bot.command('deletecategory', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, category_1.deleteCategory)(ctx);
    });
    bot.command('addproduct', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, product_1.addProduct)(ctx);
    });
    bot.command('editproduct', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, product_1.editProduct)(ctx);
    });
    bot.command('deleteproduct', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, product_1.deleteProduct)(ctx);
    });
    bot.command('addvariation', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, variation_1.addVariation)(ctx);
    });
    bot.command('editvariation', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, variation_1.editVariation)(ctx);
    });
    bot.command('deletevariation', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, variation_1.deleteVariation)(ctx);
    });
    bot.command('addstock', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, stock_1.addStock)(ctx);
    });
    bot.command('bulkaddstock', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, stock_1.bulkAddStock)(ctx);
    });
    bot.command('stocks', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, stock_1.listStocks)(ctx);
    });
    bot.command('orders', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, orders_2.listOrders)(ctx);
    });
    bot.command('approveorder', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, orders_2.approveOrder)(ctx);
    });
    bot.command('cancelorder', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, orders_2.cancelOrder)(ctx);
    });
    bot.command('refund', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, orders_2.refundOrder)(ctx);
    });
    bot.command('users', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, users_1.listUsers)(ctx);
    });
    bot.command('userinfo', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, users_1.userInfo)(ctx);
    });
    bot.command('ban', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, users_1.banUser)(ctx);
    });
    bot.command('unban', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, users_1.unbanUser)(ctx);
    });
    bot.command('addbalance', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, users_1.addBalance)(ctx);
    });
    bot.command('broadcast', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, broadcast_1.broadcastMessage)(ctx);
    });
    bot.command('stats', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, stats_1.botStats)(ctx);
    });
    bot.command('setsetting', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, settings_2.setSetting)(ctx);
    });
    bot.command('getsetting', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, settings_2.getSetting)(ctx);
    });
    bot.command('manageproviders', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, settings_2.manageProviders)(ctx);
    });
    bot.command('testemail', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, settings_2.testEmail)(ctx);
    });
    bot.command('maintenance', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, settings_2.toggleMaintenance)(ctx);
    });
    // NEW: PipraPay admin commands
    bot.command('listdeposits', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, deposits_1.listDeposits)(ctx);
    });
    bot.command('verifydeposit', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, verify_2.verifyDeposit)(ctx);
    });
    bot.command('refunddeposit', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, refunddeposit_1.refundDeposit)(ctx);
    });
    // ---------- Superadmin Commands ----------
    bot.command('addadmin', async (ctx) => {
        if (!await (0, superadmin_1.isSuperAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, superadmin_2.addAdmin)(ctx);
    });
    bot.command('removeadmin', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, superadmin_2.removeAdmin)(ctx);
    });
    bot.command('setsuperadmin', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, superadmin_2.setSuperAdmin)(ctx);
    });
    bot.command('listadmins', async (ctx) => {
        if (!(0, admin_1.isAdmin)(ctx.from?.id))
            return ctx.reply('⛔ Unauthorized.');
        return (0, superadmin_2.listAdmins)(ctx);
    });
    // ---------- Callback Query Handler ----------
    bot.on('callback_query', callback_query_1.handleCallbackQuery);
    // ---------- Custom Prefix Handler ----------
    bot.on('text', async (ctx) => {
        const prefix = settings_1.settings.get('command_prefix', '/');
        // Skip if prefix is '/' (standard slash) or if message is a command (Telegram already handled it)
        if (prefix === '/' || ctx.message.text.startsWith('/'))
            return;
        const text = ctx.message.text;
        if (!text.startsWith(prefix))
            return;
        const withoutPrefix = text.slice(prefix.length).trim();
        if (withoutPrefix.length === 0)
            return; // just the prefix, no command
        const parts = withoutPrefix.split(' ');
        const cmd = parts[0];
        if (!cmd)
            return; // no command word
        const cmdLower = cmd.toLowerCase();
        // Command maps
        const userCommandMap = {
            start: start_1.startCommand,
            register: register_1.registerCommand,
            login: login_1.loginCommand,
            verify: verify_1.verifyCommand,
            logout: logout_1.logoutCommand,
            profile: profile_1.profileCommand,
            balance: balance_1.balanceCommand,
            deposit: deposit_1.depositCommand,
            orders: orders_1.ordersCommand,
            products: products_1.productsCommand,
            buy: buy_1.buyCommand,
            tp: buy_1.buyCommand,
            redeem: redeem_1.redeemCommand,
            checkuid: checkuid_1.checkuidCommand,
            calc: calculator_1.calculatorCommand,
            calculator: calculator_1.calculatorCommand,
            support: support_1.supportCommand,
            faq: faq_1.faqCommand,
            changename: changename_1.changenameCommand,
            help: help_1.helpCommand,
            cancelorder: cancelorder_1.cancelOrderCommand,
        };
        const adminCommandMap = {
            addcategory: category_1.addCategory,
            editcategory: category_1.editCategory,
            deletecategory: category_1.deleteCategory,
            addproduct: product_1.addProduct,
            editproduct: product_1.editProduct,
            deleteproduct: product_1.deleteProduct,
            addvariation: variation_1.addVariation,
            editvariation: variation_1.editVariation,
            deletevariation: variation_1.deleteVariation,
            addstock: stock_1.addStock,
            bulkaddstock: stock_1.bulkAddStock,
            stocks: stock_1.listStocks,
            orders: orders_2.listOrders,
            approveorder: orders_2.approveOrder,
            cancelorder: orders_2.cancelOrder,
            refund: orders_2.refundOrder,
            users: users_1.listUsers,
            userinfo: users_1.userInfo,
            ban: users_1.banUser,
            unban: users_1.unbanUser,
            addbalance: users_1.addBalance,
            broadcast: broadcast_1.broadcastMessage,
            stats: stats_1.botStats,
            setsetting: settings_2.setSetting,
            getsetting: settings_2.getSetting,
            manageproviders: settings_2.manageProviders,
            testemail: settings_2.testEmail,
            maintenance: settings_2.toggleMaintenance,
            addadmin: superadmin_2.addAdmin,
            removeadmin: superadmin_2.removeAdmin,
            setsuperadmin: superadmin_2.setSuperAdmin,
            listadmins: superadmin_2.listAdmins,
            // NEW: PipraPay admin commands
            listdeposits: deposits_1.listDeposits,
            verifydeposit: verify_2.verifyDeposit,
            refunddeposit: refunddeposit_1.refundDeposit,
        };
        // Determine which handler to use
        let handler;
        const isUserAdmin = await (0, admin_1.isAdmin)(ctx.from?.id);
        if (isUserAdmin && adminCommandMap[cmdLower]) {
            handler = adminCommandMap[cmdLower];
        }
        else if (userCommandMap[cmdLower]) {
            handler = userCommandMap[cmdLower];
        }
        else {
            return; // unknown command
        }
        // For protected user commands, require authentication
        const protectedCommands = [
            'logout', 'profile', 'balance', 'deposit', 'orders', 'buy', 'tp', 'redeem', 'support', 'changename', 'cancelorder'
        ];
        if (protectedCommands.includes(cmdLower)) {
            const ok = await (0, authHelper_1.requireAuth)(ctx);
            if (!ok)
                return;
        }
        await handler(ctx);
    });
    // ---------- Fallback for unknown commands (already handled) ----------
    return bot;
}
