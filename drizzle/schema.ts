import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean, date, decimal } from "drizzle-orm/mysql-core";

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
  // 銀行情報（振込先設定）
  bankName: varchar("bankName", { length: 100 }),
  branchName: varchar("branchName", { length: 100 }),
  accountType: mysqlEnum("accountType", ["checking", "savings"]),
  accountNumber: varchar("accountNumber", { length: 20 }),
  accountHolder: varchar("accountHolder", { length: 100 }),
  // オーナー用カスタムURL
  customUrl: varchar("customUrl", { length: 100 }).unique(),
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
  maxDailyAmountEnabled: boolean("maxDailyAmountEnabled").default(true).notNull(), // 1日最大料金の有効/無効フラグ
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


// 決済方法設定テーブル（各駐車場ごとの決済方法設定）
export const paymentMethods = mysqlTable("paymentMethods", {
  id: int("id").autoincrement().primaryKey(),
  lotId: int("lotId").notNull().references(() => parkingLots.id, { onDelete: "cascade" }),
  method: mysqlEnum("method", ["paypay", "rakuten_pay", "line_pay", "apple_pay", "ic_card", "credit_card"]).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  // APIキー情報（暗号化推奨）
  apiKey: varchar("apiKey", { length: 256 }),
  apiSecret: varchar("apiSecret", { length: 256 }),
  merchantId: varchar("merchantId", { length: 64 }),
  // 手数料設定
  feePercentage: decimal("feePercentage", { precision: 5, scale: 2 }).default("0").notNull(), // 手数料率（%）
  feeFixed: int("feeFixed").default(0).notNull(), // 固定手数料（円）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;

// 振込スケジュールテーブル
export const payoutSchedules = mysqlTable("payoutSchedules", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  lotId: int("lotId").notNull().references(() => parkingLots.id, { onDelete: "cascade" }),
  periodStart: date("periodStart").notNull(), // 締め期間開始（月初）
  periodEnd: date("periodEnd").notNull(), // 締め期間終了（月末）
  payoutDeadline: date("payoutDeadline").notNull(), // 振込期限（翌月10日）
  totalAmount: int("totalAmount").default(0).notNull(), // 振込予定額（手数料差引後）
  status: mysqlEnum("status", ["pending", "scheduled", "completed", "failed"]).default("pending").notNull(),
  payoutDate: date("payoutDate"), // 実際の振込日
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PayoutSchedule = typeof payoutSchedules.$inferSelect;
export type InsertPayoutSchedule = typeof payoutSchedules.$inferInsert;

/**
 * 時間帯ごとの最大料金テーブル
 * 例：19時～5時は最大1300円、5時～19時は最大3000円
 */
export const maxPricingPeriods = mysqlTable("max_pricing_periods", {
  id: int("id").autoincrement().primaryKey(),
  parkingLotId: int("parkingLotId").notNull().references(() => parkingLots.id, { onDelete: "cascade" }),
  startHour: int("startHour").notNull(),
  endHour: int("endHour").notNull(),
  maxAmount: int("maxAmount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaxPricingPeriod = typeof maxPricingPeriods.$inferSelect;
export type InsertMaxPricingPeriod = typeof maxPricingPeriods.$inferInsert;
