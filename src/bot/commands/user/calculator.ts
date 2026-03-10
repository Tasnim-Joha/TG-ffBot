import { Context } from 'telegraf';
import { evaluate } from 'mathjs';
import logger from '../../../logger';

export async function calculatorCommand(ctx: Context) {
  // Check if the message is a text message
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Please send a text message with an expression.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (!args || args.length === 0) {
    await ctx.reply('Usage: /calc <expression> (e.g., /calc 2+2*5)');
    return;
  }
  const expression = args.join(' ');
  try {
    const result = evaluate(expression);
    await ctx.reply(`🧮 *Result:* ${result}`, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.warn({ expression }, 'Calculator error');
    await ctx.reply('❌ Invalid expression. Please use numbers and basic operators (+, -, *, /, parentheses).');
  }
}