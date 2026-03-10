import { db } from './database';
import { settings as settingsTable } from '../models/schema';
import { eq } from 'drizzle-orm';

type SettingValue = string | number | boolean | object | null; // allow null

class Settings {
  private cache = new Map<string, SettingValue>();
  private loaded = false;

  async load(): Promise<void> {
    this.cache.clear();
    this.loaded = false;
    const rows = await db.select().from(settingsTable);
    for (const row of rows) {
      // Safely cast row.value to SettingValue
      this.cache.set(row.key, row.value as SettingValue);
    }
    this.loaded = true;
  }

  get<T = any>(key: string, defaultValue?: T): T {
    if (!this.loaded) {
      throw new Error('Settings not loaded. Call settings.load() first.');
    }
    return this.cache.has(key) ? (this.cache.get(key) as T) : (defaultValue as T);
  }

  async set(key: string, value: any): Promise<void> {
    await db.insert(settingsTable)
      .values({ key, value })
      .onDuplicateKeyUpdate({ set: { value } });
    this.cache.set(key, value);
  }

  async reload(): Promise<void> {
    await this.load();
  }
}

export const settings = new Settings();