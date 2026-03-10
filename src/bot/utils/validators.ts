/**
 * Validators for bot command inputs
 */

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// UID validation (Free Fire UID is numeric, usually 9-11 digits)
export function isValidUid(uid: string): boolean {
  const uidRegex = /^\d{6,12}$/; // 6 to 12 digits (Free Fire UIDs are typically 9-11)
  return uidRegex.test(uid);
}

// Amount validation for deposits/prices
export function isValidAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && Number.isFinite(num);
}

// Integer validation
export function isValidInteger(value: string, min?: number, max?: number): boolean {
  const num = parseInt(value, 10);
  if (isNaN(num) || !Number.isInteger(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

// Short code validation (alphanumeric + underscore, 2-30 chars)
export function isValidShortCode(code: string): boolean {
  const shortCodeRegex = /^[a-zA-Z0-9_]{2,30}$/;
  return shortCodeRegex.test(code);
}

// Delivery type validation
export function isValidDeliveryType(type: string): type is 'voucher' | 'unipin' | 'manual' {
  return ['voucher', 'unipin', 'manual'].includes(type);
}

// Phone number validation (basic)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
}

// Order ID validation (numeric)
export function isValidOrderId(id: string): boolean {
  return isValidInteger(id, 1);
}

// Variation ID validation (numeric)
export function isValidVariationId(id: string): boolean {
  return isValidInteger(id, 1);
}

// Product ID validation (numeric)
export function isValidProductId(id: string): boolean {
  return isValidInteger(id, 1);
}

// Category ID validation (numeric)
export function isValidCategoryId(id: string): boolean {
  return isValidInteger(id, 1);
}

// User ID validation (numeric)
export function isValidUserId(id: string): boolean {
  return isValidInteger(id, 1);
}

// Percentage validation (0-100)
export function isValidPercentage(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 100;
}

// URL validation (basic)
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Date validation (YYYY-MM-DD)
export function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

// JSON validation
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// Command argument parser with validation
export interface ParsedArgs {
  [key: string]: string | number | boolean | null;
}

export function parseArgs(
  args: string[],
  schema: { [key: string]: { type: 'string' | 'number' | 'boolean' | 'int'; required?: boolean; default?: any } }
): { values: ParsedArgs; errors: string[] } {
  const values: ParsedArgs = {};
  const errors: string[] = [];
  let index = 0;

  for (const [key, def] of Object.entries(schema)) {
    if (index >= args.length) {
      if (def.required) {
        errors.push(`Missing required argument: ${key}`);
      } else if (def.default !== undefined) {
        values[key] = def.default;
      }
      continue;
    }

    const arg = args[index];
    if (arg === undefined) {
      errors.push(`Argument ${key} is missing`);
      continue;
    }

    let parsed: any;

    switch (def.type) {
      case 'number':
        parsed = parseFloat(arg);
        if (isNaN(parsed)) {
          errors.push(`Argument ${key} must be a valid number`);
        } else {
          values[key] = parsed;
        }
        break;
      case 'int':
        parsed = parseInt(arg, 10);
        if (isNaN(parsed) || !Number.isInteger(parsed)) {
          errors.push(`Argument ${key} must be a valid integer`);
        } else {
          values[key] = parsed;
        }
        break;
      case 'boolean':
        if (arg.toLowerCase() === 'true' || arg === '1') {
          values[key] = true;
        } else if (arg.toLowerCase() === 'false' || arg === '0') {
          values[key] = false;
        } else {
          errors.push(`Argument ${key} must be true/false or 1/0`);
        }
        break;
      case 'string':
      default:
        values[key] = arg;
        break;
    }
    index++;
  }

  return { values, errors };
}

// Sanitize input (remove extra whitespace, etc.)
export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

// Escape Markdown for Telegram messages
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// Truncate text to a certain length
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}