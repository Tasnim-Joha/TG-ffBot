import { Telegraf } from 'telegraf';
import { isAdmin } from './middleware/admin';
import { isSuperAdmin } from './middleware/superadmin';
import { authenticate } from './middleware/auth';
import { requireAuth } from './utils/authHelper';
import { settings } from '../config/settings';

// Import user commands
import { startCommand } from './commands/user/start';
import { registerCommand } from './commands/user/register';
import { loginCommand } from './commands/user/login';
import { verifyCommand } from './commands/user/verify';
import { logoutCommand } from './commands/user/logout';
import { setPhoneCommand } from './commands/user/setphone';
import { profileCommand } from './commands/user/profile';
import { balanceCommand } from './commands/user/balance';
import { depositCommand } from './commands/user/deposit';
import { ordersCommand } from './commands/user/orders';
import { cancelOrderCommand } from './commands/user/cancelorder';
import { productsCommand } from './commands/user/products';
import { buyCommand } from './commands/user/buy';
import { redeemCommand } from './commands/user/redeem';
import { checkuidCommand } from './commands/user/checkuid';
import { calculatorCommand } from './commands/user/calculator';
import { supportCommand } from './commands/user/support';
import { faqCommand } from './commands/user/faq';
import { changenameCommand } from './commands/user/changename';
import { helpCommand } from './commands/user/help';

// Import admin commands
import { addCategory, editCategory, deleteCategory } from './commands/admin/category';
import { addProduct, editProduct, deleteProduct } from './commands/admin/product';
import { addVariation, editVariation, deleteVariation } from './commands/admin/variation';
import { addStock, bulkAddStock, listStocks } from './commands/admin/stock';
import { listOrders, approveOrder, cancelOrder as adminCancelOrder, refundOrder } from './commands/admin/orders';
import { listUsers, userInfo, banUser, unbanUser, addBalance } from './commands/admin/users';
import { refundPayment } from './commands/admin/refund';
import { broadcastMessage } from './commands/admin/broadcast';
import { botStats } from './commands/admin/stats';
import { setSetting, getSetting, manageProviders, testEmail, toggleMaintenance } from './commands/admin/settings';

// NEW: PipraPay admin commands
import { listDeposits } from './commands/admin/deposits';
import { verifyDeposit } from './commands/admin/verify';
import { refundDeposit } from './commands/admin/refunddeposit';

// Import superadmin commands
import { addAdmin, removeAdmin, listAdmins, setSuperAdmin, getConfig, setConfig } from './commands/superadmin';

// Import callback query handler
import { handleCallbackQuery } from './events/callback-query';

export function setupBot(bot: Telegraf) {
  // ---------- Slash Commands (standard Telegram commands) ----------
  // User commands (public)
  bot.start(startCommand);
  bot.command('register', registerCommand);
  bot.command('login', loginCommand);
  bot.command('verify', verifyCommand);
  bot.command('logout', authenticate, logoutCommand);
  bot.command('setphone', authenticate, setPhoneCommand);
  bot.command('profile', authenticate, profileCommand);
  bot.command('balance', authenticate, balanceCommand);
  bot.command('deposit', authenticate, depositCommand);
  bot.command('orders', authenticate, ordersCommand);
  bot.command('products', productsCommand);
  bot.command('buy', authenticate, buyCommand);
  bot.command('cancelorder', authenticate, cancelOrderCommand);
  bot.command('tp', authenticate, buyCommand); // alias
  bot.command('redeem', authenticate, redeemCommand);
  bot.command('checkuid', checkuidCommand);
  bot.command('calc', calculatorCommand);
  bot.command('calculator', calculatorCommand);
  bot.command('support', authenticate, supportCommand);
  bot.command('faq', faqCommand);
  bot.command('changename', authenticate, changenameCommand);
  bot.command('help', helpCommand);

  // ---------- Admin Commands (protected with admin check) ----------
  bot.command('addcategory', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return addCategory(ctx);
  });
  bot.command('editcategory', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return editCategory(ctx);
  });
  bot.command('deletecategory', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return deleteCategory(ctx);
  });

  bot.command('addproduct', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return addProduct(ctx);
  });
  bot.command('editproduct', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return editProduct(ctx);
  });
  bot.command('deleteproduct', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return deleteProduct(ctx);
  });

  bot.command('addvariation', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return addVariation(ctx);
  });
  bot.command('editvariation', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return editVariation(ctx);
  });
  bot.command('deletevariation', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return deleteVariation(ctx);
  });

  bot.command('addstock', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return addStock(ctx);
  });
  bot.command('bulkaddstock', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return bulkAddStock(ctx);
  });
  bot.command('stocks', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return listStocks(ctx);
  });

  bot.command('orders', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return listOrders(ctx);
  });
  bot.command('approveorder', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return approveOrder(ctx);
  });
  bot.command('cancelorder', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return adminCancelOrder(ctx);
  });
  bot.command('refund', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return refundOrder(ctx);
  });

  bot.command('users', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return listUsers(ctx);
  });
  bot.command('userinfo', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return userInfo(ctx);
  });
  bot.command('ban', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return banUser(ctx);
  });
  bot.command('unban', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return unbanUser(ctx);
  });
  bot.command('addbalance', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return addBalance(ctx);
  });

  bot.command('broadcast', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return broadcastMessage(ctx);
  });
  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return botStats(ctx);
  });
  bot.command('setsetting', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return setSetting(ctx);
  });
  bot.command('getsetting', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return getSetting(ctx);
  });
  bot.command('manageproviders', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return manageProviders(ctx);
  });
  bot.command('testemail', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return testEmail(ctx);
  });
  bot.command('maintenance', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return toggleMaintenance(ctx);
  });

  // NEW: PipraPay admin commands
  bot.command('listdeposits', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return listDeposits(ctx);
  });
  bot.command('verifydeposit', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return verifyDeposit(ctx);
  });
  bot.command('refunddeposit', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return refundDeposit(ctx);
  });

  // ---------- Superadmin Commands ----------
  bot.command('addadmin', async (ctx) => {
    if (!await isSuperAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return addAdmin(ctx);
  });
  bot.command('removeadmin', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return removeAdmin(ctx);
  });
  bot.command('setsuperadmin', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return setSuperAdmin(ctx);
  });
  bot.command('listadmins', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('⛔ Unauthorized.');
    return listAdmins(ctx);
  });

  // ---------- Callback Query Handler ----------
  bot.on('callback_query', handleCallbackQuery);

  // ---------- Custom Prefix Handler ----------
  bot.on('text', async (ctx) => {
    const prefix = settings.get<string>('command_prefix', '/');
    // Skip if prefix is '/' (standard slash) or if message is a command (Telegram already handled it)
    if (prefix === '/' || ctx.message.text.startsWith('/')) return;

    const text = ctx.message.text;
    if (!text.startsWith(prefix)) return;

    const withoutPrefix = text.slice(prefix.length).trim();
    if (withoutPrefix.length === 0) return; // just the prefix, no command

    const parts = withoutPrefix.split(' ');
    const cmd = parts[0];
    if (!cmd) return; // no command word

    const cmdLower = cmd.toLowerCase();

    // Command maps
    const userCommandMap: Record<string, (ctx: any) => Promise<void>> = {
      start: startCommand,
      register: registerCommand,
      login: loginCommand,
      verify: verifyCommand,
      logout: logoutCommand,
      profile: profileCommand,
      balance: balanceCommand,
      deposit: depositCommand,
      orders: ordersCommand,
      products: productsCommand,
      buy: buyCommand,
      tp: buyCommand,
      redeem: redeemCommand,
      checkuid: checkuidCommand,
      calc: calculatorCommand,
      calculator: calculatorCommand,
      support: supportCommand,
      faq: faqCommand,
      changename: changenameCommand,
      help: helpCommand,
      cancelorder: cancelOrderCommand,
    };

    const adminCommandMap: Record<string, (ctx: any) => Promise<void>> = {
      addcategory: addCategory,
      editcategory: editCategory,
      deletecategory: deleteCategory,
      addproduct: addProduct,
      editproduct: editProduct,
      deleteproduct: deleteProduct,
      addvariation: addVariation,
      editvariation: editVariation,
      deletevariation: deleteVariation,
      addstock: addStock,
      bulkaddstock: bulkAddStock,
      stocks: listStocks,
      orders: listOrders,
      approveorder: approveOrder,
      cancelorder: adminCancelOrder,
      refund: refundOrder,
      users: listUsers,
      userinfo: userInfo,
      ban: banUser,
      unban: unbanUser,
      addbalance: addBalance,
      broadcast: broadcastMessage,
      stats: botStats,
      setsetting: setSetting,
      getsetting: getSetting,
      manageproviders: manageProviders,
      testemail: testEmail,
      maintenance: toggleMaintenance,
      addadmin: addAdmin,
      removeadmin: removeAdmin,
      setsuperadmin: setSuperAdmin,
      listadmins: listAdmins,
      // NEW: PipraPay admin commands
      listdeposits: listDeposits,
      verifydeposit: verifyDeposit,
      refunddeposit: refundDeposit,
    };

    // Determine which handler to use
    let handler: ((ctx: any) => Promise<void>) | undefined;
    const isUserAdmin = await isAdmin(ctx.from?.id);
    if (isUserAdmin && adminCommandMap[cmdLower]) {
      handler = adminCommandMap[cmdLower];
    } else if (userCommandMap[cmdLower]) {
      handler = userCommandMap[cmdLower];
    } else {
      return; // unknown command
    }

    // For protected user commands, require authentication
    const protectedCommands = [
      'logout', 'profile', 'balance', 'deposit', 'orders', 'buy', 'tp', 'redeem', 'support', 'changename', 'cancelorder'
    ];
    if (protectedCommands.includes(cmdLower)) {
      const ok = await requireAuth(ctx);
      if (!ok) return;
    }

    await handler(ctx);
  });

  // ---------- Fallback for unknown commands (already handled) ----------
  return bot;
}