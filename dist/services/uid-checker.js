"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUid = checkUid;
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../config/database");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../logger"));
const TIMEOUT = 10000; // 10 seconds
/**
 * Check Free Fire UID using multiple providers in priority order.
 * @param uid - The player's UID
 * @param region - Region code (default: 'BD')
 */
async function checkUid(uid, region = 'BD') {
    // Get all active providers ordered by priority (lower number = higher priority)
    const providers = await database_1.db.select()
        .from(schema_1.uidProviders)
        .where((0, drizzle_orm_1.eq)(schema_1.uidProviders.isActive, 1))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.uidProviders.priority));
    if (providers.length === 0) {
        throw new Error('No UID checker providers configured');
    }
    const errors = [];
    for (const provider of providers) {
        try {
            switch (provider.providerKey) {
                case 'hlgaming':
                    if (!provider.apiKey || !provider.userUid) {
                        errors.push(`Provider ${provider.name} missing credentials`);
                        continue;
                    }
                    return await callHlGaming(uid, region, provider.baseUrl, provider.apiKey, provider.userUid);
                case 'bhauxinfo':
                    // Pass the region to Bhauxinfo (it will use the provided region, defaulting to BD inside the function if needed)
                    return await callBhauxinfo(uid, provider.baseUrl, region);
                case 'freefireapi':
                    return await callFreefireApi(uid, provider.baseUrl);
                default:
                    errors.push(`Unsupported provider key: ${provider.providerKey}`);
                    continue;
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Provider ${provider.name} failed: ${message}`);
            continue;
        }
    }
    throw new Error(`All UID checkers failed. Errors: ${errors.join('; ')}`);
}
async function callHlGaming(uid, region, baseUrl, apiKey, userUid) {
    const response = await axios_1.default.get(`${baseUrl}/main/games/freefire/account/api`, {
        params: {
            sectionName: 'AllData',
            PlayerUid: uid,
            region,
            useruid: userUid,
            api: apiKey
        },
        timeout: TIMEOUT
    });
    if (response.data?.result?.AccountInfo?.AccountName) {
        return {
            name: response.data.result.AccountInfo.AccountName,
            level: response.data.result.AccountInfo?.AccountLevel,
            avatar: response.data.result.AccountInfo?.AvatarUrl,
            region
        };
    }
    throw new Error('No data from HL Gaming');
}
async function callBhauxinfo(uid, baseUrl, region = 'BD') {
    const url = `${baseUrl}/bhau`;
    logger_1.default.debug({ url, uid, region }, 'Calling Bhauxinfo');
    try {
        const response = await axios_1.default.get(url, {
            params: { uid, region }, // use the provided region
            timeout: TIMEOUT,
        });
        if (response.data?.basicInfo?.nickname) {
            return {
                name: response.data.basicInfo.nickname,
                level: response.data.basicInfo?.level,
                avatar: response.data.basicInfo?.avatarUrl,
                region: response.data.basicInfo?.region || region
            };
        }
        throw new Error('No data from Bhauxinfo');
    }
    catch (error) {
        logger_1.default.error({ error, uid, region }, 'Bhauxinfo error');
        throw error;
    }
}
async function callFreefireApi(uid, baseUrl) {
    // Note: baseUrl should include the full path, e.g., https://ffinfodevelopersketvia.vercel.app/player-info
    const response = await axios_1.default.get(baseUrl, {
        params: { uid },
        timeout: TIMEOUT
    });
    if (response.data?.status && response.data?.data?.nickname) {
        return {
            name: response.data.data.nickname,
            level: response.data.data?.level,
            avatar: response.data.data?.avatar_url,
            region: response.data.data?.region
        };
    }
    throw new Error('No data from Freefire API');
}
