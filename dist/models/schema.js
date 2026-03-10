"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uidProviders = exports.settings = exports.transactions = exports.deposits = exports.usedCodes = exports.vouchers = exports.orders = exports.variations = exports.products = exports.categories = exports.otpTokens = exports.users = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
// Table: users
exports.users = (0, mysql_core_1.mysqlTable)('users', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    telegramId: (0, mysql_core_1.bigint)('telegram_id', { mode: 'number' }),
    email: (0, mysql_core_1.varchar)('email', { length: 255 }),
    phone: (0, mysql_core_1.varchar)('phone', { length: 20 }),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }),
    balance: (0, mysql_core_1.decimal)('balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
    role: (0, mysql_core_1.mysqlEnum)('role', ['user', 'admin', 'super_admin']).notNull().default('user'),
    isLoggedIn: (0, mysql_core_1.tinyint)('is_logged_in').notNull().default(0),
    lastActivity: (0, mysql_core_1.timestamp)('last_activity'),
    sessionExpiresAt: (0, mysql_core_1.timestamp)('session_expires_at'),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: (0, mysql_core_1.timestamp)('deleted_at'),
}, (table) => ({
    telegramIdUnique: (0, mysql_core_1.uniqueIndex)('telegram_id').on(table.telegramId),
    emailUnique: (0, mysql_core_1.uniqueIndex)('email').on(table.email),
    telegramIdx: (0, mysql_core_1.index)('idx_telegram_id').on(table.telegramId),
    emailIdx: (0, mysql_core_1.index)('idx_email').on(table.email),
}));
// Table: otp_tokens
exports.otpTokens = (0, mysql_core_1.mysqlTable)('otp_tokens', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    userId: (0, mysql_core_1.bigint)('user_id', { mode: 'number' }).references(() => exports.users.id, { onDelete: 'cascade' }),
    telegramId: (0, mysql_core_1.bigint)('telegram_id', { mode: 'number' }), // new
    email: (0, mysql_core_1.varchar)('email', { length: 255 }).notNull(),
    token: (0, mysql_core_1.varchar)('token', { length: 6 }).notNull(),
    type: (0, mysql_core_1.mysqlEnum)('type', ['register', 'login']).notNull().default('register'),
    expiresAt: (0, mysql_core_1.timestamp)('expires_at').notNull(),
    usedAt: (0, mysql_core_1.timestamp)('used_at'),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => ({
    uniqEmailToken: (0, mysql_core_1.uniqueIndex)('uniq_email_token').on(table.email, table.token),
    otpEmailIdx: (0, mysql_core_1.index)('idx_otp_email').on(table.email),
    otpTokenIdx: (0, mysql_core_1.index)('idx_otp_token').on(table.token),
    otpEmailTypeIdx: (0, mysql_core_1.index)('idx_otp_email_type').on(table.email, table.type),
    otpLookupIdx: (0, mysql_core_1.index)('idx_otp_lookup').on(table.email, table.token, table.expiresAt),
}));
// Table: categories
exports.categories = (0, mysql_core_1.mysqlTable)('categories', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)('description'),
    status: (0, mysql_core_1.mysqlEnum)('status', ['active', 'inactive']).notNull().default('active'),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: (0, mysql_core_1.timestamp)('deleted_at'),
});
// Table: products
exports.products = (0, mysql_core_1.mysqlTable)('products', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    categoryId: (0, mysql_core_1.bigint)('category_id', { mode: 'number' }).notNull().references(() => exports.categories.id, { onDelete: 'cascade' }),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)('description'),
    status: (0, mysql_core_1.mysqlEnum)('status', ['active', 'inactive']).notNull().default('active'),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: (0, mysql_core_1.timestamp)('deleted_at'),
}, (table) => ({
    categoryIdx: (0, mysql_core_1.index)('idx_product_category').on(table.categoryId),
}));
// Table: variations
exports.variations = (0, mysql_core_1.mysqlTable)('variations', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    productId: (0, mysql_core_1.bigint)('product_id', { mode: 'number' }).notNull().references(() => exports.products.id, { onDelete: 'cascade' }),
    title: (0, mysql_core_1.varchar)('title', { length: 255 }).notNull(),
    shortCode: (0, mysql_core_1.varchar)('short_code', { length: 50 }).notNull().unique(),
    price: (0, mysql_core_1.decimal)('price', { precision: 10, scale: 2 }).notNull(),
    deliveryType: (0, mysql_core_1.mysqlEnum)('delivery_type', ['voucher', 'unipin', 'manual']).notNull(),
    region: (0, mysql_core_1.varchar)('region', { length: 10 }),
    unipinCode: (0, mysql_core_1.varchar)('unipin_code', { length: 100 }),
    stock: (0, mysql_core_1.int)('stock').notNull().default(0),
    status: (0, mysql_core_1.mysqlEnum)('status', ['active', 'inactive']).notNull().default('active'),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: (0, mysql_core_1.timestamp)('deleted_at'),
}, (table) => ({
    productIdx: (0, mysql_core_1.index)('idx_variation_product').on(table.productId),
    shortCodeUnique: (0, mysql_core_1.uniqueIndex)('short_code').on(table.shortCode),
}));
// Table: orders
exports.orders = (0, mysql_core_1.mysqlTable)('orders', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    orderNumber: (0, mysql_core_1.varchar)('order_number', { length: 30 }).notNull().unique(),
    userId: (0, mysql_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    variationId: (0, mysql_core_1.bigint)('variation_id', { mode: 'number' }).references(() => exports.variations.id, { onDelete: 'restrict' }),
    productNameSnapshot: (0, mysql_core_1.varchar)('product_name_snapshot', { length: 255 }).notNull(),
    variationTitleSnapshot: (0, mysql_core_1.varchar)('variation_title_snapshot', { length: 255 }).notNull(),
    priceSnapshot: (0, mysql_core_1.decimal)('price_snapshot', { precision: 10, scale: 2 }).notNull(),
    uid: (0, mysql_core_1.varchar)('uid', { length: 50 }),
    quantity: (0, mysql_core_1.int)('quantity').notNull().default(1),
    totalAmount: (0, mysql_core_1.decimal)('total_amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: (0, mysql_core_1.varchar)('payment_method', { length: 50 }).notNull(),
    paymentStatus: (0, mysql_core_1.mysqlEnum)('payment_status', ['pending', 'paid', 'failed', 'refunded']).notNull().default('pending'),
    orderStatus: (0, mysql_core_1.mysqlEnum)('order_status', ['pending', 'processing', 'completed', 'cancelled']).notNull().default('pending'),
    gatewayRef: (0, mysql_core_1.varchar)('gateway_ref', { length: 255 }),
    unipinRef: (0, mysql_core_1.varchar)('unipin_ref', { length: 255 }),
    ipAddress: (0, mysql_core_1.varchar)('ip_address', { length: 45 }),
    userAgent: (0, mysql_core_1.text)('user_agent'),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow().notNull(),
    completedAt: (0, mysql_core_1.timestamp)('completed_at'),
    cancelledAt: (0, mysql_core_1.timestamp)('cancelled_at'),
}, (table) => ({
    orderNumberUnique: (0, mysql_core_1.uniqueIndex)('order_number').on(table.orderNumber),
    userIdx: (0, mysql_core_1.index)('idx_order_user').on(table.userId),
    statusIdx: (0, mysql_core_1.index)('idx_order_status').on(table.orderStatus),
    paymentStatusIdx: (0, mysql_core_1.index)('idx_order_payment_status').on(table.paymentStatus),
    statusPaymentIdx: (0, mysql_core_1.index)('idx_order_status_payment').on(table.orderStatus, table.paymentStatus),
    createdIdx: (0, mysql_core_1.index)('idx_order_created').on(table.createdAt),
    userCreatedIdx: (0, mysql_core_1.index)('idx_user_created').on(table.userId, table.createdAt),
}));
// Table: vouchers
exports.vouchers = (0, mysql_core_1.mysqlTable)('vouchers', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    variationId: (0, mysql_core_1.bigint)('variation_id', { mode: 'number' }).notNull().references(() => exports.variations.id, { onDelete: 'cascade' }),
    code: (0, mysql_core_1.varchar)('code', { length: 255 }).notNull().unique(),
    isUsed: (0, mysql_core_1.tinyint)('is_used').notNull().default(0),
    orderId: (0, mysql_core_1.bigint)('order_id', { mode: 'number' }).references(() => exports.orders.id, { onDelete: 'set null' }).unique(),
    usedAt: (0, mysql_core_1.timestamp)('used_at'),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => ({
    codeUnique: (0, mysql_core_1.uniqueIndex)('code').on(table.code),
    variationIdx: (0, mysql_core_1.index)('idx_voucher_variation').on(table.variationId),
    isUsedIdx: (0, mysql_core_1.index)('idx_voucher_used').on(table.isUsed),
    variationUsedIdx: (0, mysql_core_1.index)('idx_variation_used').on(table.variationId, table.isUsed),
    orderIdUnique: (0, mysql_core_1.uniqueIndex)('order_id').on(table.orderId),
}));
// Table: used_codes
exports.usedCodes = (0, mysql_core_1.mysqlTable)('used_codes', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    code: (0, mysql_core_1.varchar)('code', { length: 255 }).notNull().unique(),
    userId: (0, mysql_core_1.bigint)('user_id', { mode: 'number' }).references(() => exports.users.id, { onDelete: 'cascade' }),
    orderId: (0, mysql_core_1.bigint)('order_id', { mode: 'number' }).references(() => exports.orders.id, { onDelete: 'set null' }),
    usedAt: (0, mysql_core_1.timestamp)('used_at').defaultNow().notNull(),
}, (table) => ({
    codeUnique: (0, mysql_core_1.uniqueIndex)('code').on(table.code),
    codeIdx: (0, mysql_core_1.index)('idx_used_code').on(table.code),
}));
// Table: deposits
exports.deposits = (0, mysql_core_1.mysqlTable)('deposits', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    userId: (0, mysql_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    amount: (0, mysql_core_1.decimal)('amount', { precision: 10, scale: 2 }).notNull(),
    status: (0, mysql_core_1.mysqlEnum)('status', ['pending', 'completed', 'failed', 'refunded']).notNull().default('pending'),
    gatewayRef: (0, mysql_core_1.varchar)('gateway_ref', { length: 255 }),
    idempotencyKey: (0, mysql_core_1.varchar)('idempotency_key', { length: 100 }).unique(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    statusIdx: (0, mysql_core_1.index)('idx_deposit_status').on(table.status),
    idempotencyUnique: (0, mysql_core_1.uniqueIndex)('idempotency_key').on(table.idempotencyKey),
}));
// Table: transactions
exports.transactions = (0, mysql_core_1.mysqlTable)('transactions', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    userId: (0, mysql_core_1.bigint)('user_id', { mode: 'number' }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    type: (0, mysql_core_1.mysqlEnum)('type', ['deposit', 'debit', 'refund']).notNull(),
    amount: (0, mysql_core_1.decimal)('amount', { precision: 10, scale: 2 }).notNull(),
    balanceBefore: (0, mysql_core_1.decimal)('balance_before', { precision: 15, scale: 2 }).notNull(),
    balanceAfter: (0, mysql_core_1.decimal)('balance_after', { precision: 15, scale: 2 }).notNull(),
    referenceType: (0, mysql_core_1.mysqlEnum)('reference_type', ['order', 'deposit', 'manual']).notNull(),
    referenceId: (0, mysql_core_1.bigint)('reference_id', { mode: 'number' }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => ({
    createdIdx: (0, mysql_core_1.index)('idx_transaction_created').on(table.createdAt),
    referenceIdx: (0, mysql_core_1.index)('idx_transaction_reference').on(table.referenceType, table.referenceId),
    userCreatedIdx: (0, mysql_core_1.index)('idx_transactions_user_created').on(table.userId, table.createdAt),
}));
// Table: settings
exports.settings = (0, mysql_core_1.mysqlTable)('settings', {
    key: (0, mysql_core_1.varchar)('key', { length: 100 }).primaryKey(),
    value: (0, mysql_core_1.json)('value'),
    description: (0, mysql_core_1.text)('description'),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow().notNull(),
});
// Table: uid_providers
exports.uidProviders = (0, mysql_core_1.mysqlTable)('uid_providers', {
    id: (0, mysql_core_1.bigint)('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: (0, mysql_core_1.varchar)('name', { length: 100 }).notNull(),
    providerKey: (0, mysql_core_1.varchar)('provider_key', { length: 50 }).notNull().unique(),
    baseUrl: (0, mysql_core_1.varchar)('base_url', { length: 255 }),
    apiKey: (0, mysql_core_1.varchar)('api_key', { length: 255 }),
    userUid: (0, mysql_core_1.varchar)('user_uid', { length: 100 }),
    priority: (0, mysql_core_1.int)('priority').notNull().default(0),
    isActive: (0, mysql_core_1.tinyint)('is_active').notNull().default(1),
    createdAt: (0, mysql_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    providerKeyUnique: (0, mysql_core_1.uniqueIndex)('provider_key').on(table.providerKey),
}));
