"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = void 0;
const database_1 = require("./database");
const schema_1 = require("../models/schema");
class Settings {
    constructor() {
        this.cache = new Map();
        this.loaded = false;
    }
    async load() {
        this.cache.clear();
        this.loaded = false;
        const rows = await database_1.db.select().from(schema_1.settings);
        for (const row of rows) {
            // Safely cast row.value to SettingValue
            this.cache.set(row.key, row.value);
        }
        this.loaded = true;
    }
    get(key, defaultValue) {
        if (!this.loaded) {
            throw new Error('Settings not loaded. Call settings.load() first.');
        }
        return this.cache.has(key) ? this.cache.get(key) : defaultValue;
    }
    async set(key, value) {
        await database_1.db.insert(schema_1.settings)
            .values({ key, value })
            .onDuplicateKeyUpdate({ set: { value } });
        this.cache.set(key, value);
    }
    async reload() {
        await this.load();
    }
}
exports.settings = new Settings();
