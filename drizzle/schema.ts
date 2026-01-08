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
  // Stripe Connect
  stripeAccountId: varchar("stripeAccountId", { length: 64 }), // Stripe Connected Account ID
  stripeOnboardingComplete: boolean("stripeOnboardingComplete").default(false).notNull(),
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
  paymentMethod: mysqlEnum("paymentMethod", ["paypay", "credit_card"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed"]).default("pending").notNull(),
  transactionId: varchar("transactionId", { length: 64 }), // デモ用トランザクションID
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 64 }), // Stripe PaymentIntent ID
  isDemo: boolean("isDemo").default(true).notNull(), // デモ決済か実決済か
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = typeof paymentRecords.$inferInsert;
