import { 
  mysqlTable, 
  bigint, 
  varchar, 
  timestamp, 
  decimal, 
  tinyint, 
  text, 
  int,
  mysqlEnum,
  json,
  uniqueIndex,
  index,
  primaryKey,
  foreignKey
} from 'drizzle-orm/mysql-core';

// Table: users
export const users = mysqlTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  telegramId: bigint('telegram_id', { mode: 'number' }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  name: varchar('name', { length: 255 }),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
  role: mysqlEnum('role', ['user', 'admin', 'super_admin']).notNull().default('user'),
  isLoggedIn: tinyint('is_logged_in').notNull().default(0),
  lastActivity: timestamp('last_activity'),
  sessionExpiresAt: timestamp('session_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  telegramIdUnique: uniqueIndex('telegram_id').on(table.telegramId),
  emailUnique: uniqueIndex('email').on(table.email),
  telegramIdx: index('idx_telegram_id').on(table.telegramId),
  emailIdx: index('idx_email').on(table.email),
}));

// Table: otp_tokens
export const otpTokens = mysqlTable('otp_tokens', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }),
  telegramId: bigint('telegram_id', { mode: 'number' }), // new
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 6 }).notNull(),
  type: mysqlEnum('type', ['register', 'login']).notNull().default('register'),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqEmailToken: uniqueIndex('uniq_email_token').on(table.email, table.token),
  otpEmailIdx: index('idx_otp_email').on(table.email),
  otpTokenIdx: index('idx_otp_token').on(table.token),
  otpEmailTypeIdx: index('idx_otp_email_type').on(table.email, table.type),
  otpLookupIdx: index('idx_otp_lookup').on(table.email, table.token, table.expiresAt),
}));

// Table: categories
export const categories = mysqlTable('categories', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Table: products
export const products = mysqlTable('products', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  categoryId: bigint('category_id', { mode: 'number' }).notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  categoryIdx: index('idx_product_category').on(table.categoryId),
}));

// Table: variations
export const variations = mysqlTable('variations', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  productId: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  shortCode: varchar('short_code', { length: 50 }).notNull().unique(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  deliveryType: mysqlEnum('delivery_type', ['voucher', 'unipin', 'manual']).notNull(),
  region: varchar('region', { length: 10 }),
  unipinCode: varchar('unipin_code', { length: 100 }),
  stock: int('stock').notNull().default(0),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  productIdx: index('idx_variation_product').on(table.productId),
  shortCodeUnique: uniqueIndex('short_code').on(table.shortCode),
}));

// Table: orders
export const orders = mysqlTable('orders', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  orderNumber: varchar('order_number', { length: 30 }).notNull().unique(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  variationId: bigint('variation_id', { mode: 'number' }).references(() => variations.id, { onDelete: 'restrict' }),
  productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
  variationTitleSnapshot: varchar('variation_title_snapshot', { length: 255 }).notNull(),
  priceSnapshot: decimal('price_snapshot', { precision: 10, scale: 2 }).notNull(),
  uid: varchar('uid', { length: 50 }),
  quantity: int('quantity').notNull().default(1),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
paymentStatus: mysqlEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']).notNull().default('pending'),
  orderStatus: mysqlEnum('order_status', ['pending', 'processing', 'completed', 'cancelled']).notNull().default('pending'),
  gatewayRef: varchar('gateway_ref', { length: 255 }),
  unipinRef: varchar('unipin_ref', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
}, (table) => ({
  orderNumberUnique: uniqueIndex('order_number').on(table.orderNumber),
  userIdx: index('idx_order_user').on(table.userId),
  statusIdx: index('idx_order_status').on(table.orderStatus),
  paymentStatusIdx: index('idx_order_payment_status').on(table.paymentStatus),
  statusPaymentIdx: index('idx_order_status_payment').on(table.orderStatus, table.paymentStatus),
  createdIdx: index('idx_order_created').on(table.createdAt),
  userCreatedIdx: index('idx_user_created').on(table.userId, table.createdAt),
}));

// Table: vouchers
export const vouchers = mysqlTable('vouchers', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  variationId: bigint('variation_id', { mode: 'number' }).notNull().references(() => variations.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 255 }).notNull().unique(),
  isUsed: tinyint('is_used').notNull().default(0),
  orderId: bigint('order_id', { mode: 'number' }).references(() => orders.id, { onDelete: 'set null' }).unique(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  codeUnique: uniqueIndex('code').on(table.code),
  variationIdx: index('idx_voucher_variation').on(table.variationId),
  isUsedIdx: index('idx_voucher_used').on(table.isUsed),
  variationUsedIdx: index('idx_variation_used').on(table.variationId, table.isUsed),
  orderIdUnique: uniqueIndex('order_id').on(table.orderId),
}));

// Table: used_codes
export const usedCodes = mysqlTable('used_codes', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  code: varchar('code', { length: 255 }).notNull().unique(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }),
  orderId: bigint('order_id', { mode: 'number' }).references(() => orders.id, { onDelete: 'set null' }),
  usedAt: timestamp('used_at').defaultNow().notNull(),
}, (table) => ({
  codeUnique: uniqueIndex('code').on(table.code),
  codeIdx: index('idx_used_code').on(table.code),
}));

// Table: deposits
export const deposits = mysqlTable('deposits', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('BDT'),   // <-- ADD THIS LINE
  status: mysqlEnum('status', ['pending', 'completed', 'failed', 'refunded']).notNull().default('pending'),
  gatewayRef: varchar('gateway_ref', { length: 255 }),
  idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index('idx_deposit_status').on(table.status),
  idempotencyUnique: uniqueIndex('idempotency_key').on(table.idempotencyKey),
}));

// Table: transactions
export const transactions = mysqlTable('transactions', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: mysqlEnum('type', ['deposit', 'debit', 'refund']).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 15, scale: 2 }).notNull(),
  referenceType: mysqlEnum('reference_type', ['order', 'deposit', 'manual']).notNull(),
  referenceId: bigint('reference_id', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  createdIdx: index('idx_transaction_created').on(table.createdAt),
  referenceIdx: index('idx_transaction_reference').on(table.referenceType, table.referenceId),
  userCreatedIdx: index('idx_transactions_user_created').on(table.userId, table.createdAt),
}));

// Table: settings
export const settings = mysqlTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: json('value'),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Table: uid_providers
export const uidProviders = mysqlTable('uid_providers', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  providerKey: varchar('provider_key', { length: 50 }).notNull().unique(),
  baseUrl: varchar('base_url', { length: 255 }),
  apiKey: varchar('api_key', { length: 255 }),
  userUid: varchar('user_uid', { length: 100 }),
  priority: int('priority').notNull().default(0),
  isActive: tinyint('is_active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerKeyUnique: uniqueIndex('provider_key').on(table.providerKey),
}));