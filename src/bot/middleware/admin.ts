import { settings } from '../../config/settings';

export function isAdmin(telegramId?: number): boolean {
  if (!telegramId) return false;
  const adminIds = settings.get<number[]>('admin_ids', []);
  return adminIds.includes(telegramId);
}