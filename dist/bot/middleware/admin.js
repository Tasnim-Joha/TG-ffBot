"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = isAdmin;
const settings_1 = require("../../config/settings");
function isAdmin(telegramId) {
    if (!telegramId)
        return false;
    const adminIds = settings_1.settings.get('admin_ids', []);
    return adminIds.includes(telegramId);
}
