"use strict";
/**
 * Validators for bot command inputs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEmail = isValidEmail;
exports.isValidUid = isValidUid;
exports.isValidAmount = isValidAmount;
exports.isValidInteger = isValidInteger;
exports.isValidShortCode = isValidShortCode;
exports.isValidDeliveryType = isValidDeliveryType;
exports.isValidPhone = isValidPhone;
exports.isValidOrderId = isValidOrderId;
exports.isValidVariationId = isValidVariationId;
exports.isValidProductId = isValidProductId;
exports.isValidCategoryId = isValidCategoryId;
exports.isValidUserId = isValidUserId;
exports.isValidPercentage = isValidPercentage;
exports.isValidUrl = isValidUrl;
exports.isValidDate = isValidDate;
exports.isValidJSON = isValidJSON;
exports.parseArgs = parseArgs;
exports.sanitizeInput = sanitizeInput;
exports.escapeMarkdown = escapeMarkdown;
exports.truncate = truncate;
// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// UID validation (Free Fire UID is numeric, usually 9-11 digits)
function isValidUid(uid) {
    const uidRegex = /^\d{6,12}$/; // 6 to 12 digits (Free Fire UIDs are typically 9-11)
    return uidRegex.test(uid);
}
// Amount validation for deposits/prices
function isValidAmount(amount) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(num) && num > 0 && Number.isFinite(num);
}
// Integer validation
function isValidInteger(value, min, max) {
    const num = parseInt(value, 10);
    if (isNaN(num) || !Number.isInteger(num))
        return false;
    if (min !== undefined && num < min)
        return false;
    if (max !== undefined && num > max)
        return false;
    return true;
}
// Short code validation (alphanumeric + underscore, 2-30 chars)
function isValidShortCode(code) {
    const shortCodeRegex = /^[a-zA-Z0-9_]{2,30}$/;
    return shortCodeRegex.test(code);
}
// Delivery type validation
function isValidDeliveryType(type) {
    return ['voucher', 'unipin', 'manual'].includes(type);
}
// Phone number validation (basic)
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
}
// Order ID validation (numeric)
function isValidOrderId(id) {
    return isValidInteger(id, 1);
}
// Variation ID validation (numeric)
function isValidVariationId(id) {
    return isValidInteger(id, 1);
}
// Product ID validation (numeric)
function isValidProductId(id) {
    return isValidInteger(id, 1);
}
// Category ID validation (numeric)
function isValidCategoryId(id) {
    return isValidInteger(id, 1);
}
// User ID validation (numeric)
function isValidUserId(id) {
    return isValidInteger(id, 1);
}
// Percentage validation (0-100)
function isValidPercentage(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
}
// URL validation (basic)
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
// Date validation (YYYY-MM-DD)
function isValidDate(dateStr) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr))
        return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
}
// JSON validation
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
}
function parseArgs(args, schema) {
    const values = {};
    const errors = [];
    let index = 0;
    for (const [key, def] of Object.entries(schema)) {
        if (index >= args.length) {
            if (def.required) {
                errors.push(`Missing required argument: ${key}`);
            }
            else if (def.default !== undefined) {
                values[key] = def.default;
            }
            continue;
        }
        const arg = args[index];
        if (arg === undefined) {
            errors.push(`Argument ${key} is missing`);
            continue;
        }
        let parsed;
        switch (def.type) {
            case 'number':
                parsed = parseFloat(arg);
                if (isNaN(parsed)) {
                    errors.push(`Argument ${key} must be a valid number`);
                }
                else {
                    values[key] = parsed;
                }
                break;
            case 'int':
                parsed = parseInt(arg, 10);
                if (isNaN(parsed) || !Number.isInteger(parsed)) {
                    errors.push(`Argument ${key} must be a valid integer`);
                }
                else {
                    values[key] = parsed;
                }
                break;
            case 'boolean':
                if (arg.toLowerCase() === 'true' || arg === '1') {
                    values[key] = true;
                }
                else if (arg.toLowerCase() === 'false' || arg === '0') {
                    values[key] = false;
                }
                else {
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
function sanitizeInput(input) {
    return input.trim().replace(/\s+/g, ' ');
}
// Escape Markdown for Telegram messages
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
// Truncate text to a certain length
function truncate(text, maxLength, suffix = '...') {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}
