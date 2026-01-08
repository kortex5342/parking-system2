import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, parkingSpaces, parkingRecords, paymentRecords, InsertParkingSpace, InsertParkingRecord, InsertPaymentRecord } from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from 'nanoid';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== User Queries ==========
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== Parking Space Queries ==========

// 初期化: 10台分の駐車スペースを作成
export async function initializeParkingSpaces(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (let i = 1; i <= 10; i++) {
    const qrCode = `PARK-${i.toString().padStart(2, '0')}-${nanoid(8)}`;
    try {
      await db.insert(parkingSpaces).values({
        spaceNumber: i,
        status: "available",
        qrCode,
      }).onDuplicateKeyUpdate({
        set: { updatedAt: new Date() }
      });
    } catch (error) {
      // スペースが既に存在する場合は無視
    }
  }
}

// 全駐車スペース取得
export async function getAllParkingSpaces() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(parkingSpaces).orderBy(parkingSpaces.spaceNumber);
}

// QRコードで駐車スペース取得
export async function getParkingSpaceByQrCode(qrCode: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(parkingSpaces).where(eq(parkingSpaces.qrCode, qrCode)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// スペース番号で駐車スペース取得
export async function getParkingSpaceByNumber(spaceNumber: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(parkingSpaces).where(eq(parkingSpaces.spaceNumber, spaceNumber)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// 駐車スペースのステータス更新
export async function updateParkingSpaceStatus(spaceId: number, status: "available" | "occupied") {
  const db = await getDb();
  if (!db) return;

  await db.update(parkingSpaces).set({ status }).where(eq(parkingSpaces.id, spaceId));
}

// ========== Parking Record Queries ==========

// 入庫記録作成
export async function createParkingRecord(spaceId: number, spaceNumber: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sessionToken = nanoid(32);
  const entryTime = Date.now();

  await db.insert(parkingRecords).values({
    spaceId,
    spaceNumber,
    entryTime,
    status: "active",
    sessionToken,
  });

  // スペースを使用中に更新
  await updateParkingSpaceStatus(spaceId, "occupied");

  return sessionToken;
}

// セッショントークンで入庫記録取得
export async function getParkingRecordByToken(sessionToken: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(parkingRecords).where(eq(parkingRecords.sessionToken, sessionToken)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// アクティブな入庫記録をスペースIDで取得
export async function getActiveParkingRecordBySpaceId(spaceId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(parkingRecords)
    .where(and(eq(parkingRecords.spaceId, spaceId), eq(parkingRecords.status, "active")))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// 入庫記録を完了に更新
export async function completeParkingRecord(recordId: number, exitTime: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(parkingRecords).set({ 
    exitTime, 
    status: "completed" 
  }).where(eq(parkingRecords.id, recordId));
}

// 全アクティブ入庫記録取得（管理者用）
export async function getAllActiveParkingRecords() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(parkingRecords)
    .where(eq(parkingRecords.status, "active"))
    .orderBy(parkingRecords.spaceNumber);
}

// ========== Payment Record Queries ==========

// 決済記録作成
export async function createPaymentRecord(data: {
  parkingRecordId: number;
  spaceNumber: number;
  entryTime: number;
  exitTime: number;
  durationMinutes: number;
  amount: number;
  paymentMethod: "paypay" | "credit_card";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const transactionId = `TXN-${nanoid(16)}`;

  const result = await db.insert(paymentRecords).values({
    ...data,
    paymentStatus: "pending",
    transactionId,
  });

  return Number(result[0].insertId);
}

// 決済完了に更新
export async function completePayment(paymentId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(paymentRecords).set({ 
    paymentStatus: "completed" 
  }).where(eq(paymentRecords.id, paymentId));
}

// 全決済履歴取得（管理者用）
export async function getAllPaymentRecords(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(paymentRecords)
    .orderBy(desc(paymentRecords.createdAt))
    .limit(limit);
}

// 料金計算（1時間300円、端数切り上げ）
export function calculateParkingFee(entryTime: number, exitTime: number): { durationMinutes: number; amount: number } {
  const durationMs = exitTime - entryTime;
  const durationMinutes = Math.ceil(durationMs / (1000 * 60));
  const hours = Math.ceil(durationMinutes / 60);
  const amount = hours * 300;
  
  return { durationMinutes, amount };
}


// ========== Stripe Connect Queries ==========

// ユーザーのStripeアカウントIDを更新
export async function updateUserStripeAccount(userId: number, stripeAccountId: string, onboardingComplete: boolean = false) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    stripeAccountId,
    stripeOnboardingComplete: onboardingComplete,
  }).where(eq(users.id, userId));
}

// ユーザーのStripeオンボーディング完了を更新
export async function updateUserStripeOnboardingComplete(userId: number, complete: boolean) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    stripeOnboardingComplete: complete,
  }).where(eq(users.id, userId));
}

// ユーザーIDでユーザー取得
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// 管理者ユーザー取得（Stripe接続状態確認用）
export async function getAdminUser() {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  return result.length > 0 ? result[0] : null;
}

// 決済記録作成（Stripe対応版）
export async function createPaymentRecordWithStripe(data: {
  parkingRecordId: number;
  spaceNumber: number;
  entryTime: number;
  exitTime: number;
  durationMinutes: number;
  amount: number;
  paymentMethod: "paypay" | "credit_card";
  stripePaymentIntentId?: string;
  isDemo: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const transactionId = data.isDemo ? `TXN-${nanoid(16)}` : undefined;

  const result = await db.insert(paymentRecords).values({
    parkingRecordId: data.parkingRecordId,
    spaceNumber: data.spaceNumber,
    entryTime: data.entryTime,
    exitTime: data.exitTime,
    durationMinutes: data.durationMinutes,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    paymentStatus: "pending",
    transactionId,
    stripePaymentIntentId: data.stripePaymentIntentId,
    isDemo: data.isDemo,
  });

  return Number(result[0].insertId);
}

// Stripe PaymentIntent IDで決済記録を更新
export async function updatePaymentByStripePaymentIntent(stripePaymentIntentId: string, status: "completed" | "failed") {
  const db = await getDb();
  if (!db) return;

  await db.update(paymentRecords).set({ 
    paymentStatus: status 
  }).where(eq(paymentRecords.stripePaymentIntentId, stripePaymentIntentId));
}
