import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Stripe (APIキー直接入力方式)
  stripeSecretKey: varchar("stripeSecretKey", { length: 256 }), // Stripe Secret Key
  stripePublishableKey: varchar("stripePublishableKey", { length: 256 }), // Stripe Publishable Key
  stripeConnected: boolean("stripeConnected").default(false).notNull(),
  // 旧Stripe Connect (後方互換)
  stripeAccountId: varchar("stripeAccountId", { length: 64 }), // Stripe Connected Account ID
  stripeOnboardingComplete: boolean("stripeOnboardingComplete").default(false).notNull(),
  // Square
  squareAccessToken: varchar("squareAccessToken", { length: 256 }), // Square Access Token
  squareMerchantId: varchar("squareMerchantId", { length: 64 }), // Square Merchant ID
  squareLocationId: varchar("squareLocationId", { length: 64 }), // Square Location ID
  squareRefreshToken: varchar("squareRefreshToken", { length: 256 }), // Square Refresh Token
  squareConnected: boolean("squareConnected").default(false).notNull(),
  // PayPay
  paypayApiKey: varchar("paypayApiKey", { length: 256 }), // PayPay API Key
  paypayApiSecret: varchar("paypayApiSecret", { length: 256 }), // PayPay API Secret
  paypayMerchantId: varchar("paypayMerchantId", { length: 64 }), // PayPay Merchant ID
  paypayConnected: boolean("paypayConnected").default(false).notNull(),
  // 決済プロバイダー選択（stripe or square）
  cardPaymentProvider: mysqlEnum("cardPaymentProvider", ["stripe", "square"]),
  // 料金設定
  pricingUnitMinutes: int("pricingUnitMinutes").default(60).notNull(), // 課金単位（分）10-60
  pricingAmount: int("pricingAmount").default(300).notNull(), // 料金（円）
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 駐車スペーステーブル（10台分）
 */
export const parkingSpaces = mysqlTable("parking_spaces", {
  id: int("id").autoincrement().primaryKey(),
  spaceNumber: int("spaceNumber").notNull().unique(), // 1-10
  status: mysqlEnum("status", ["available", "occupied"]).default("available").notNull(),
  qrCode: varchar("qrCode", { length: 64 }).notNull().unique(), // QRコード識別子
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ParkingSpace = typeof parkingSpaces.$inferSelect;
export type InsertParkingSpace = typeof parkingSpaces.$inferInsert;

/**
 * 入庫記録テーブル
 */
export const parkingRecords = mysqlTable("parking_records", {
  id: int("id").autoincrement().primaryKey(),
  spaceId: int("spaceId").notNull(), // 駐車スペースID
  spaceNumber: int("spaceNumber").notNull(), // 駐車スペース番号（表示用）
  entryTime: bigint("entryTime", { mode: "number" }).notNull(), // 入庫時刻（UTC Unix timestamp ms）
  exitTime: bigint("exitTime", { mode: "number" }), // 出庫時刻（UTC Unix timestamp ms）
  status: mysqlEnum("status", ["active", "completed"]).default("active").notNull(),
  sessionToken: varchar("sessionToken", { length: 64 }).notNull().unique(), // セッション識別子
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ParkingRecord = typeof parkingRecords.$inferSelect;
export type InsertParkingRecord = typeof parkingRecords.$inferInsert;

/**
 * 決済履歴テーブル
 */
export const paymentRecords = mysqlTable("payment_records", {
  id: int("id").autoincrement().primaryKey(),
  parkingRecordId: int("parkingRecordId").notNull(), // 入庫記録ID
  spaceNumber: int("spaceNumber").notNull(), // 駐車スペース番号（表示用）
  entryTime: bigint("entryTime", { mode: "number" }).notNull(), // 入庫時刻
  exitTime: bigint("exitTime", { mode: "number" }).notNull(), // 出庫時刻
  durationMinutes: int("durationMinutes").notNull(), // 駐車時間（分）
  amount: int("amount").notNull(), // 料金（円）
  paymentMethod: mysqlEnum("paymentMethod", ["paypay", "credit_card", "stripe", "square"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed"]).default("pending").notNull(),
  transactionId: varchar("transactionId", { length: 64 }), // デモ用トランザクションID
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 64 }), // Stripe PaymentIntent ID
  squarePaymentId: varchar("squarePaymentId", { length: 64 }), // Square Payment ID
  paypayPaymentId: varchar("paypayPaymentId", { length: 64 }), // PayPay Payment ID
  isDemo: boolean("isDemo").default(true).notNull(), // デモ決済か実決済か
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = typeof paymentRecords.$inferInsert;
