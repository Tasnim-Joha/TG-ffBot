"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callUnipinRedeem = callUnipinRedeem;
const axios_1 = __importDefault(require("axios"));
const settings_1 = require("../config/settings");
const logger_1 = __importDefault(require("../logger"));
async function callUnipinRedeem(uid, code, region = 'BD') {
    const baseUrlRaw = settings_1.settings.get('unipin_base_url') || 'https://androidartist.com/api/uctopup';
    const baseUrl = baseUrlRaw.replace(/^"|"$/g, ''); // remove leading/trailing quotes
    const apiKeyRaw = settings_1.settings.get('unipin_api_key') || 'TPBD-1B87AB7E6594F330';
    const apiKey = apiKeyRaw.replace(/^"|"$/g, '');
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    if (!baseUrl || !apiKey) {
        throw new Error('UniPin API not configured');
    }
    const payload = {
        api: apiKey,
        playerid: uid,
        code: code,
        region,
        url: `${appBaseUrl}/webhook/unipin`, // optional callback
    };
    try {
        const response = await axios_1.default.post(baseUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
        });
        if (response.status >= 200 && response.status < 300) {
            return { success: true, orderId: response.data?.orderid };
        }
        return { success: false, message: response.data?.message || 'UniPin API error' };
    }
    catch (error) {
        logger_1.default.error(error, 'UniPin API call failed');
        return { success: false, message: error.message };
    }
}
