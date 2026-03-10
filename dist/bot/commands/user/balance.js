"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceCommand = balanceCommand;
const database_1 = require("../../../config/database");
const schema_1 = require("../../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../../../logger"));
async function balanceCommand(ctx) {
    // The authenticate middleware will attach dbUser to ctx
    const dbUser = ctx.dbUser;
    if (!dbUser) {
        await ctx.reply('You need to be logged in to check your balance.');
        return;
    }
    try {
        // Fetch the latest balance from the database (in case it changed since last request)
        const [user] = await database_1.db.select({ balance: schema_1.users.balance })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, dbUser.id))
            .limit(1);
        if (!user) {
            await ctx.reply('User not found.');
            return;
        }
        const balance = parseFloat(user.balance).toFixed(2);
        await ctx.reply(`💰 Your current wallet balance is *৳${balance}*.`, { parse_mode: 'Markdown' });
    }
    catch (error) {
        logger_1.default.error(error, 'Balance command error');
        await ctx.reply('Failed to fetch balance. Please try again later.');
    }
}
