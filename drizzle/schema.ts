import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * role: user (駐車場利用者), owner (駐車場オーナー), admin (運営者)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }), // 電話番号
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "owner", "admin"]).default("user").notNull(),
  status: mysqlEnum("status", ["pending", "active", "suspended"]).default("active").notNull(), // アカウント状態
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Stripe (APIキー直接入力方式)
  stripeSecretKey: varchar("stripeSecretKey", { length: 256 }),
  stripePublishableKey: varchar("stripePublishableKey", { length: 256 }),
  stripeConnected: boolean("stripeConnected").default(false).notNull(),
  // 旧Stripe Connect (後方互換)
  stripeAccountId: varchar("stripeAccountId", { length: 64 }),
  stripeOnboardingComplete: boolean("stripeOnboardingComplete").default(false).notNull(),
  // Square
  squareAccessToken: varchar("squareAccessToken", { length: 256 }),
  squareMerchantId: varchar("squareMerchantId", { length: 64 }),
  squareLocationId: varchar("squareLocationId", { length: 64 }),
  squareRefreshToken: varchar("squareRefreshToken", { length: 256 }),
  squareConnected: boolean("squareConnected").default(false).notNull(),
  // PayPay
  paypayApiKey: varchar("paypayApiKey", { length: 256 }),
  paypayApiSecret: varchar("paypayApiSecret", { length: 256 }),
  paypayMerchantId: varchar("paypayMerchantId", { length: 64 }),
  paypayConnected: boolean("paypayConnected").default(false).notNull(),
  // 決済プロバイダー選択（stripe or square）
  cardPaymentProvider: mysqlEnum("cardPaymentProvider", ["stripe", "square"]),
  // 料金設定（オーナーごと）
  pricingUnitMinutes: int("pricingUnitMinutes").default(60).notNull(),
  pricingAmount: int("pricingAmount").default(300).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 駐車場テーブル（オーナーごとに複数持てる）
 */
export const parkingLots = mysqlTable("parking_lots", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(), // オーナーのユーザーID
  name: varchar("name", { length: 100 }).notNull(), // 駐車場名
  address: text("address"), // 住所
  description: text("description"), // 説明
  totalSpaces: int("totalSpaces").default(10).notNull(), // 総スペース数
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  // 料金設定（駐車場ごと、オーナーのデフォルトを上書き可能）
  pricingUnitMinutes: int("pricingUnitMinutes"), // nullの場合はオーナーのデフォルトを使用
  pricingAmount: int("pricingAmount"), // nullの場合はオーナーのデフォルトを使用
  maxDailyAmount: int("maxDailyAmount"), // 1日最大料金（オプション）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ParkingLot = typeof parkingLots.$inferSelect;
export type InsertParkingLot = typeof parkingLots.$inferInsert;

/**
 * 駐車スペーステーブル（駐車場に紐付く）
 */
export const parkingSpaces = mysqlTable("parking_spaces", {
  id: int("id").autoincrement().primaryKey(),
  parkingLotId: int("parkingLotId"), // 駐車場ID（nullの場合は旧データ）
  spaceNumber: int("spaceNumber").notNull(), // スペース番号
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
  parkingLotId: int("parkingLotId"), // 駐車場ID
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
  parkingLotId: int("parkingLotId"), // 駐車場ID
  ownerId: int("ownerId"), // オーナーID（売上集計用）
  parkingRecordId: int("parkingRecordId").notNull(), // 入庫記録ID
  spaceNumber: int("spaceNumber").notNull(), // 駐車スペース番号（表示用）
  entryTime: bigint("entryTime", { mode: "number" }).notNull(), // 入庫時刻
  exitTime: bigint("exitTime", { mode: "number" }).notNull(), // 出庫時刻
  durationMinutes: int("durationMinutes").notNull(), // 駐車時間（分）
  amount: int("amount").notNull(), // 料金（円）
  paymentMethod: mysqlEnum("paymentMethod", ["paypay", "credit_card", "stripe", "square"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed"]).default("pending").notNull(),
  transactionId: varchar("transactionId", { length: 64 }), // デモ用トランザクションID
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 64 }),
  squarePaymentId: varchar("squarePaymentId", { length: 64 }),
  paypayPaymentId: varchar("paypayPaymentId", { length: 64 }),
  isDemo: boolean("isDemo").default(true).notNull(), // デモ決済か実決済か
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = typeof paymentRecords.$inferInsert;
