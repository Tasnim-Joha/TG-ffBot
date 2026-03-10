import axios from 'axios';
import { db } from '../config/database';
import { uidProviders } from '../models/schema';
import { eq, asc } from 'drizzle-orm';
import logger from '../logger';

const TIMEOUT = 10000; // 10 seconds

export interface PlayerInfo {
  name: string;
  level?: number;
  avatar?: string;
  region?: string;
}

/**
 * Check Free Fire UID using multiple providers in priority order.
 * @param uid - The player's UID
 * @param region - Region code (default: 'BD')
 */
export async function checkUid(uid: string, region: string = 'BD'): Promise<PlayerInfo> {
  // Get all active providers ordered by priority (lower number = higher priority)
  const providers = await db.select()
    .from(uidProviders)
    .where(eq(uidProviders.isActive, 1))
    .orderBy(asc(uidProviders.priority));

  if (providers.length === 0) {
    throw new Error('No UID checker providers configured');
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      switch (provider.providerKey) {
        case 'hlgaming':
          if (!provider.apiKey || !provider.userUid) {
            errors.push(`Provider ${provider.name} missing credentials`);
            continue;
          }
          return await callHlGaming(uid, region, provider.baseUrl!, provider.apiKey, provider.userUid);
        case 'bhauxinfo':
          // Pass the region to Bhauxinfo (it will use the provided region, defaulting to BD inside the function if needed)
          return await callBhauxinfo(uid, provider.baseUrl!, region);
        case 'freefireapi':
          return await callFreefireApi(uid, provider.baseUrl!);
        default:
          errors.push(`Unsupported provider key: ${provider.providerKey}`);
          continue;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Provider ${provider.name} failed: ${message}`);
      continue;
    }
  }

  throw new Error(`All UID checkers failed. Errors: ${errors.join('; ')}`);
}

async function callHlGaming(uid: string, region: string, baseUrl: string, apiKey: string, userUid: string): Promise<PlayerInfo> {
  const response = await axios.get(`${baseUrl}/main/games/freefire/account/api`, {
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

async function callBhauxinfo(uid: string, baseUrl: string, region: string = 'BD'): Promise<PlayerInfo> {
  const url = `${baseUrl}/bhau`;
  logger.debug({ url, uid, region }, 'Calling Bhauxinfo');

  try {
    const response = await axios.get(url, {
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
  } catch (error: any) {
    logger.error({ error, uid, region }, 'Bhauxinfo error');
    throw error;
  }
}

async function callFreefireApi(uid: string, baseUrl: string): Promise<PlayerInfo> {
  // Note: baseUrl should include the full path, e.g., https://ffinfodevelopersketvia.vercel.app/player-info
  const response = await axios.get(baseUrl, {
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