"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleMaintenance = exports.testEmail = exports.manageProviders = exports.setSetting = exports.getSetting = exports.botStats = exports.broadcastMessage = exports.addBalance = exports.unbanUser = exports.banUser = exports.userInfo = exports.listUsers = exports.refundOrder = exports.cancelOrder = exports.approveOrder = exports.viewOrder = exports.listOrders = exports.listStocks = exports.bulkAddStock = exports.addStock = exports.listVariations = exports.deleteVariation = exports.editVariation = exports.addVariation = exports.deleteProduct = exports.editProduct = exports.addProduct = exports.deleteCategory = exports.editCategory = exports.addCategory = void 0;
// Category commands
var category_1 = require("./category");
Object.defineProperty(exports, "addCategory", { enumerable: true, get: function () { return category_1.addCategory; } });
Object.defineProperty(exports, "editCategory", { enumerable: true, get: function () { return category_1.editCategory; } });
Object.defineProperty(exports, "deleteCategory", { enumerable: true, get: function () { return category_1.deleteCategory; } });
// Product commands
var product_1 = require("./product");
Object.defineProperty(exports, "addProduct", { enumerable: true, get: function () { return product_1.addProduct; } });
Object.defineProperty(exports, "editProduct", { enumerable: true, get: function () { return product_1.editProduct; } });
Object.defineProperty(exports, "deleteProduct", { enumerable: true, get: function () { return product_1.deleteProduct; } });
// Variation commands
var variation_1 = require("./variation");
Object.defineProperty(exports, "addVariation", { enumerable: true, get: function () { return variation_1.addVariation; } });
Object.defineProperty(exports, "editVariation", { enumerable: true, get: function () { return variation_1.editVariation; } });
Object.defineProperty(exports, "deleteVariation", { enumerable: true, get: function () { return variation_1.deleteVariation; } });
Object.defineProperty(exports, "listVariations", { enumerable: true, get: function () { return variation_1.listVariations; } });
// Stock commands
var stock_1 = require("./stock");
Object.defineProperty(exports, "addStock", { enumerable: true, get: function () { return stock_1.addStock; } });
Object.defineProperty(exports, "bulkAddStock", { enumerable: true, get: function () { return stock_1.bulkAddStock; } });
Object.defineProperty(exports, "listStocks", { enumerable: true, get: function () { return stock_1.listStocks; } });
// Order commands
var orders_1 = require("./orders");
Object.defineProperty(exports, "listOrders", { enumerable: true, get: function () { return orders_1.listOrders; } });
Object.defineProperty(exports, "viewOrder", { enumerable: true, get: function () { return orders_1.viewOrder; } });
Object.defineProperty(exports, "approveOrder", { enumerable: true, get: function () { return orders_1.approveOrder; } });
Object.defineProperty(exports, "cancelOrder", { enumerable: true, get: function () { return orders_1.cancelOrder; } });
Object.defineProperty(exports, "refundOrder", { enumerable: true, get: function () { return orders_1.refundOrder; } });
// User management commands
var users_1 = require("./users");
Object.defineProperty(exports, "listUsers", { enumerable: true, get: function () { return users_1.listUsers; } });
Object.defineProperty(exports, "userInfo", { enumerable: true, get: function () { return users_1.userInfo; } });
Object.defineProperty(exports, "banUser", { enumerable: true, get: function () { return users_1.banUser; } });
Object.defineProperty(exports, "unbanUser", { enumerable: true, get: function () { return users_1.unbanUser; } });
Object.defineProperty(exports, "addBalance", { enumerable: true, get: function () { return users_1.addBalance; } });
// Broadcast command
var broadcast_1 = require("./broadcast");
Object.defineProperty(exports, "broadcastMessage", { enumerable: true, get: function () { return broadcast_1.broadcastMessage; } });
// Stats command
var stats_1 = require("./stats");
Object.defineProperty(exports, "botStats", { enumerable: true, get: function () { return stats_1.botStats; } });
// Settings commands
var settings_1 = require("./settings");
Object.defineProperty(exports, "getSetting", { enumerable: true, get: function () { return settings_1.getSetting; } });
Object.defineProperty(exports, "setSetting", { enumerable: true, get: function () { return settings_1.setSetting; } });
Object.defineProperty(exports, "manageProviders", { enumerable: true, get: function () { return settings_1.manageProviders; } });
Object.defineProperty(exports, "testEmail", { enumerable: true, get: function () { return settings_1.testEmail; } });
Object.defineProperty(exports, "toggleMaintenance", { enumerable: true, get: function () { return settings_1.toggleMaintenance; } });
