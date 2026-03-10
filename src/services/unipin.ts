import axios from 'axios';
import { settings } from '../config/settings';
import logger from '../logger';

export async function callUnipinRedeem(
  uid: string,
  code: string,
  region: string = 'BD'
): Promise<{ success: boolean; message?: string; orderId?: string }> {
  const baseUrlRaw = settings.get<string>('unipin_base_url') || 'https://androidartist.com/api/uctopup';
  const baseUrl = baseUrlRaw.replace(/^"|"$/g, ''); // remove leading/trailing quotes
  const apiKeyRaw = settings.get<string>('unipin_api_key') || 'TPBD-1B87AB7E6594F330';
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
    const response = await axios.post(baseUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.status >= 200 && response.status < 300) {
      return { success: true, orderId: response.data?.orderid };
    }
    return { success: false, message: response.data?.message || 'UniPin API error' };
  } catch (error: any) {
    logger.error(error, 'UniPin API call failed');
    return { success: false, message: error.message };
  }
}