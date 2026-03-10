import { Context } from 'telegraf';
import { isAdmin } from '../../middleware/admin';
import { isSuperAdmin } from '../../middleware/superadmin';
import { settings } from '../../../config/settings';

export async function helpCommand(ctx: Context) {
  const telegramId = ctx.from?.id;
  const userIsAdmin = await isAdmin(telegramId);
  const userIsSuperAdmin = await isSuperAdmin(telegramId);

  let helpText = `
📚 *Available Commands*

👤 *User Commands*
/start - Welcome message
/register <email> - Register with your email
/login <email> - Login with email
/verify <otp> - Verify OTP
/logout - Log out
/profile - View your profile
/balance - Check wallet balance
/deposit <amount> - Deposit money
/orders - View your orders
/cancelorder <order_id> - Cancel pending order
/products - Browse products
/buy <code> [uid] - Purchase a product
/checkuid <uid> - Check Free Fire player name
/redeem <code> [uid] - Redeem external code
/calc <expression> - Calculator
/support <message> - Contact support
/faq - Frequently asked questions
/changename <new_name> - Update your display name
/help - Show this help
`;

  if (userIsAdmin) {
    helpText += `

🛠️ *Admin Commands*
/addcategory <name> [description] - Add category
/editcategory <id> <name> [description] - Edit category
/deletecategory <id> - Delete category
/addproduct <category_id> <name> [description] - Add product
/editproduct <id> <name> [description] - Edit product
/deleteproduct <id> - Delete product
/addvariation <product_id> <title> <short_code> <price> <delivery_type> [region] [unipin_code] - Add variation
/editvariation <id> <field> <value> - Edit variation
/deletevariation <id> - Delete variation
/addstock <variation_id> <code> - Add voucher code
/bulkaddstock - Bulk add codes (file)
/stocks - View stock levels
/orders - List all orders
/order <id> - View order details
/approveorder <id> - Mark order completed
/cancelorder <id> - Cancel order (with optional refund)
/refund <id> - Refund order
/users - List users
/userinfo <id> - View user details
/ban <id> [reason] - Ban user
/unban <id> - Unban user
/addbalance <id> <amount> - Add wallet balance
/broadcast <message> - Send message to all users
/stats - Bot statistics
/setsetting <key> <value> - Update setting
/getsetting <key> - View setting
/manageproviders - Manage UID providers
/testemail <email> - Test SMTP
/maintenance - Toggle maintenance mode
`;
  }

  if (userIsSuperAdmin) {
    helpText += `

👑 *Superadmin Commands*
/addadmin <user_id> - Promote to admin
/removeadmin <user_id> - Demote to user
/setsuperadmin <user_id> - Grant superadmin
/listadmins - List all admins
/getconfig [key] - View raw config
/setconfig <key> <value> - Set raw config
`;
  }

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}