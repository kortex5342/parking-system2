import { eq, desc, and, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, parkingSpaces, parkingRecords, paymentRecords, paymentMethods, payoutSchedules, InsertParkingSpace, InsertParkingRecord, InsertPaymentRecord, InsertPaymentMethod, InsertPayoutSchedule } from "../drizzle/schema";
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

  // LOT-{lotId}-SPACE-{spaceNumber} 形式の場合
  const lotSpaceMatch = qrCode.match(/^LOT-(\d+)-SPACE-(\d+)$/);
  if (lotSpaceMatch) {
    const lotId = parseInt(lotSpaceMatch[1]);
    const spaceNumber = parseInt(lotSpaceMatch[2]);
    const result = await db.select().from(parkingSpaces)
      .where(and(
        eq(parkingSpaces.parkingLotId, lotId),
        eq(parkingSpaces.spaceNumber, spaceNumber)
      ))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  }

  // 通常のQRコード形式
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


// ========== Square Connect Queries ==========

// ユーザーのSquare接続情報を更新
export async function updateUserSquareAccount(
  userId: number, 
  data: {
    accessToken: string;
    refreshToken: string;
    merchantId: string;
    locationId?: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    squareAccessToken: data.accessToken,
    squareRefreshToken: data.refreshToken,
    squareMerchantId: data.merchantId,
    squareLocationId: data.locationId || null,
    squareConnected: true,
  }).where(eq(users.id, userId));
}

// SquareロケーションIDを更新
export async function updateUserSquareLocation(userId: number, locationId: string) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    squareLocationId: locationId,
  }).where(eq(users.id, userId));
}

// Square接続を解除
export async function disconnectUserSquare(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    squareAccessToken: null,
    squareRefreshToken: null,
    squareMerchantId: null,
    squareLocationId: null,
    squareConnected: false,
  }).where(eq(users.id, userId));
}

// ========== PayPay API Queries ==========

// ユーザーのPayPay接続情報を更新
export async function updateUserPayPayAccount(
  userId: number, 
  data: {
    apiKey: string;
    apiSecret: string;
    merchantId: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    paypayApiKey: data.apiKey,
    paypayApiSecret: data.apiSecret,
    paypayMerchantId: data.merchantId,
    paypayConnected: true,
  }).where(eq(users.id, userId));
}

// PayPay接続を解除
export async function disconnectUserPayPay(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    paypayApiKey: null,
    paypayApiSecret: null,
    paypayMerchantId: null,
    paypayConnected: false,
  }).where(eq(users.id, userId));
}

// ========== カード決済プロバイダー選択 ==========

// カード決済プロバイダーを設定
export async function setCardPaymentProvider(userId: number, provider: "stripe" | "square" | null) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    cardPaymentProvider: provider,
  }).where(eq(users.id, userId));
}

// Stripe接続を解除
export async function disconnectUserStripe(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    stripeAccountId: null,
    stripeOnboardingComplete: false,
  }).where(eq(users.id, userId));
}

// ========== 決済記録（拡張版） ==========

// 決済記録作成（全プロバイダー対応版）
export async function createPaymentRecordFull(data: {
  parkingRecordId: number;
  spaceNumber: number;
  entryTime: number;
  exitTime: number;
  durationMinutes: number;
  amount: number;
  paymentMethod: "paypay" | "credit_card" | "stripe" | "square";
  stripePaymentIntentId?: string;
  squarePaymentId?: string;
  paypayPaymentId?: string;
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
    squarePaymentId: data.squarePaymentId,
    paypayPaymentId: data.paypayPaymentId,
    isDemo: data.isDemo,
  });

  return Number(result[0].insertId);
}


// ========== Stripe APIキー直接入力方式 ==========

// StripeのAPIキーを保存
export async function saveUserStripeApiKeys(
  userId: number, 
  data: {
    secretKey: string;
    publishableKey: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    stripeSecretKey: data.secretKey,
    stripePublishableKey: data.publishableKey,
    stripeConnected: true,
    cardPaymentProvider: 'stripe',
  }).where(eq(users.id, userId));
}

// Stripe APIキー接続を解除
export async function disconnectUserStripeApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    stripeSecretKey: null,
    stripePublishableKey: null,
    stripeConnected: false,
  }).where(eq(users.id, userId));
}

// ========== Square APIキー直接入力方式 ==========

// SquareのAccess Tokenを保存
export async function saveUserSquareAccessToken(
  userId: number, 
  accessToken: string
) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    squareAccessToken: accessToken,
    squareConnected: true,
    cardPaymentProvider: 'square',
  }).where(eq(users.id, userId));
}

// ========== 料金設定 ==========

// 料金設定を更新
export async function updatePricingSettings(
  userId: number, 
  data: {
    unitMinutes: number;
    amount: number;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    pricingUnitMinutes: data.unitMinutes,
    pricingAmount: data.amount,
  }).where(eq(users.id, userId));
}

// 料金設定を取得
export async function getPricingSettings() {
  const admin = await getAdminUser();
  if (!admin) {
    return { unitMinutes: 60, amount: 300 }; // デフォルト値
  }
  return {
    unitMinutes: admin.pricingUnitMinutes,
    amount: admin.pricingAmount,
  };
}

// 動的料金計算
export async function calculateParkingFeeDynamic(entryTime: number, exitTime: number): Promise<{ durationMinutes: number; amount: number }> {
  const pricing = await getPricingSettings();
  const durationMs = exitTime - entryTime;
  const durationMinutes = Math.ceil(durationMs / (1000 * 60));
  const units = Math.ceil(durationMinutes / pricing.unitMinutes);
  const amount = units * pricing.amount;
  
  return { durationMinutes, amount };
}


// ========== マルチテナント対応 ==========

import { parkingLots, InsertParkingLot, ParkingLot } from "../drizzle/schema";

// ========== オーナー管理 ==========

// オーナーとして登録申請
export async function registerAsOwner(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    role: 'owner',
    status: 'pending', // 承認待ち
  }).where(eq(users.id, userId));
}

// オーナー申請を承認
export async function approveOwner(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    status: 'active',
  }).where(eq(users.id, userId));
}

// オーナーを停止
export async function suspendOwner(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ 
    status: 'suspended',
  }).where(eq(users.id, userId));
}

// 全オーナー一覧取得
export async function getAllOwners() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users)
    .where(eq(users.role, 'owner'))
    .orderBy(desc(users.createdAt));
}

// 承認待ちオーナー一覧取得
export async function getPendingOwners() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users)
    .where(and(eq(users.role, 'owner'), eq(users.status, 'pending')))
    .orderBy(desc(users.createdAt));
}

// ========== 駐車場管理 ==========

// 駐車場作成
export async function createParkingLot(data: {
  ownerId: number;
  name: string;
  address?: string;
  description?: string;
  totalSpaces?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(parkingLots).values({
    ownerId: data.ownerId,
    name: data.name,
    address: data.address || null,
    description: data.description || null,
    totalSpaces: data.totalSpaces || 10,
    status: 'active',
  });

  return Number(result[0].insertId);
}

// オーナーの駐車場一覧取得
export async function getParkingLotsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(parkingLots)
    .where(eq(parkingLots.ownerId, ownerId))
    .orderBy(desc(parkingLots.createdAt));
}

// 駐車場取得
export async function getParkingLotById(lotId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(parkingLots)
    .where(eq(parkingLots.id, lotId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// 駐車場更新
export async function updateParkingLot(lotId: number, data: {
  name?: string;
  address?: string;
  description?: string;
  totalSpaces?: number;
  pricingUnitMinutes?: number;
  pricingAmount?: number;
  maxDailyAmount?: number;
  status?: 'active' | 'inactive';
}) {
  const db = await getDb();
  if (!db) return;

  await db.update(parkingLots).set(data).where(eq(parkingLots.id, lotId));
}

// 駐車場削除（論理削除）
export async function deleteParkingLot(lotId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(parkingLots).set({ status: 'inactive' }).where(eq(parkingLots.id, lotId));
}

// 全駐車場一覧取得（運営者用）
export async function getAllParkingLots() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(parkingLots)
    .orderBy(desc(parkingLots.createdAt));
}

// ========== 駐車スペース管理（駐車場紐付け） ==========

// 駐車場用の駐車スペースを初期化
export async function initializeParkingSpacesForLot(lotId: number, totalSpaces: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (let i = 1; i <= totalSpaces; i++) {
    const qrCode = `LOT${lotId}-PARK-${i.toString().padStart(2, '0')}-${nanoid(8)}`;
    try {
      await db.insert(parkingSpaces).values({
        parkingLotId: lotId,
        spaceNumber: i,
        status: "available",
        qrCode,
      });
    } catch (error) {
      console.error(`Failed to create parking space ${i} for lot ${lotId}:`, error);
    }
  }
}

// 駐車場の駐車スペース一覧取得
export async function getParkingSpacesByLot(lotId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(parkingSpaces)
    .where(eq(parkingSpaces.parkingLotId, lotId))
    .orderBy(parkingSpaces.spaceNumber);
}

// ========== 入庫記録（駐車場紐付け） ==========

// 入庫記録作成（駐車場紐付け）
export async function createParkingRecordForLot(
  lotId: number,
  spaceId: number, 
  spaceNumber: number
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sessionToken = nanoid(32);
  const entryTime = Date.now();

  await db.insert(parkingRecords).values({
    parkingLotId: lotId,
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

// 駐車場のアクティブ入庫記録取得
export async function getActiveParkingRecordsByLot(lotId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(parkingRecords)
    .where(and(
      eq(parkingRecords.parkingLotId, lotId),
      eq(parkingRecords.status, "active")
    ))
    .orderBy(parkingRecords.spaceNumber);
}

// ========== 決済記録（オーナー紐付け） ==========

// 決済記録作成（オーナー紐付け）
export async function createPaymentRecordForOwner(data: {
  parkingLotId: number;
  ownerId: number;
  parkingRecordId: number;
  spaceNumber: number;
  entryTime: number;
  exitTime: number;
  durationMinutes: number;
  amount: number;
  paymentMethod: "paypay" | "credit_card" | "stripe" | "square";
  stripePaymentIntentId?: string;
  squarePaymentId?: string;
  paypayPaymentId?: string;
  isDemo: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const transactionId = data.isDemo ? `TXN-${nanoid(16)}` : undefined;

  const result = await db.insert(paymentRecords).values({
    parkingLotId: data.parkingLotId,
    ownerId: data.ownerId,
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
    squarePaymentId: data.squarePaymentId,
    paypayPaymentId: data.paypayPaymentId,
    isDemo: data.isDemo,
  });

  return Number(result[0].insertId);
}

// オーナーの決済履歴取得
export async function getPaymentRecordsByOwner(ownerId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(paymentRecords)
    .where(eq(paymentRecords.ownerId, ownerId))
    .orderBy(desc(paymentRecords.createdAt))
    .limit(limit);
}

// 駐車場の決済履歴取得
export async function getPaymentRecordsByLot(lotId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(paymentRecords)
    .where(eq(paymentRecords.parkingLotId, lotId))
    .orderBy(desc(paymentRecords.createdAt))
    .limit(limit);
}

// ========== 売上集計 ==========

// オーナーの売上集計
export async function getOwnerSalesSummary(ownerId: number) {
  const db = await getDb();
  if (!db) return { totalAmount: 0, totalTransactions: 0 };

  const records = await db.select().from(paymentRecords)
    .where(and(
      eq(paymentRecords.ownerId, ownerId),
      eq(paymentRecords.paymentStatus, 'completed')
    ));

  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const totalTransactions = records.length;

  return { totalAmount, totalTransactions };
}

// 全体の売上集計（運営者用）
export async function getTotalSalesSummary() {
  const db = await getDb();
  if (!db) return { totalAmount: 0, totalTransactions: 0, totalOwners: 0, totalParkingLots: 0 };

  const records = await db.select().from(paymentRecords)
    .where(eq(paymentRecords.paymentStatus, 'completed'));

  const owners = await db.select().from(users)
    .where(eq(users.role, 'owner'));

  const lots = await db.select().from(parkingLots);

  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const totalTransactions = records.length;
  const totalOwners = owners.length;
  const totalParkingLots = lots.length;

  return { totalAmount, totalTransactions, totalOwners, totalParkingLots };
}

// ========== ユーザー情報更新 ==========

// ユーザーのプロフィール更新
export async function updateUserProfile(userId: number, data: {
  name?: string;
  email?: string;
  phone?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set(data).where(eq(users.id, userId));
}

// 全ユーザー一覧取得（運営者用）
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users)
    .orderBy(desc(users.createdAt));
}

// ユーザーのロール更新
export async function updateUserRole(userId: number, role: 'user' | 'owner' | 'admin') {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ユーザーのステータス更新
export async function updateUserStatus(userId: number, status: 'pending' | 'active' | 'suspended') {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ status }).where(eq(users.id, userId));
}


// オーナーの日ごとの売上データ（過去30日）
export async function getOwnerDailySalesData(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const records = await db.select().from(paymentRecords)
    .where(and(
      eq(paymentRecords.ownerId, ownerId),
      eq(paymentRecords.paymentStatus, 'completed'),
      gte(paymentRecords.createdAt, thirtyDaysAgo)
    ));

  // 日ごとに集計
  const dailyData: Record<string, { date: string; amount: number; count: number }> = {};
  
  records.forEach((record) => {
    const date = new Date(record.createdAt).toLocaleDateString('ja-JP');
    if (!dailyData[date]) {
      dailyData[date] = { date, amount: 0, count: 0 };
    }
    dailyData[date].amount += record.amount;
    dailyData[date].count += 1;
  });

  // 過去30日間のすべての日付を含める
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('ja-JP');
    result.push(dailyData[dateStr] || { date: dateStr, amount: 0, count: 0 });
  }

  return result;
}

// オーナーの月ごとの売上データ（過去12ヶ月）
export async function getOwnerMonthlySalesData(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const records = await db.select().from(paymentRecords)
    .where(and(
      eq(paymentRecords.ownerId, ownerId),
      eq(paymentRecords.paymentStatus, 'completed'),
      gte(paymentRecords.createdAt, twelveMonthsAgo)
    ));

  // 月ごとに集計
  const monthlyData: Record<string, { month: string; amount: number; count: number }> = {};
  
  records.forEach((record) => {
    const date = new Date(record.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[month]) {
      monthlyData[month] = { month, amount: 0, count: 0 };
    }
    monthlyData[month].amount += record.amount;
    monthlyData[month].count += 1;
  });

  // 過去12ヶ月のすべての月を含める
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    result.push(monthlyData[month] || { month: monthLabel, amount: 0, count: 0 });
  }

  return result;
}

// 銀行情報の取得
export async function getBankInfo(ownerId: number) {
  const db = await getDb();
  if (!db) return null;

  const user = await db.select().from(users)
    .where(eq(users.id, ownerId))
    .limit(1);

  if (!user || user.length === 0) return null;

  return {
    bankName: user[0].bankName || '',
    branchName: user[0].branchName || '',
    accountType: user[0].accountType || '',
    accountNumber: user[0].accountNumber || '',
    accountHolder: user[0].accountHolder || '',
  };
}

// 銀行情報の更新
export async function updateBankInfo(ownerId: number, bankInfo: {
  bankName?: string;
  branchName?: string;
  accountType?: 'checking' | 'savings';
  accountNumber?: string;
  accountHolder?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.update(users)
    .set({
      bankName: bankInfo.bankName,
      branchName: bankInfo.branchName,
      accountType: bankInfo.accountType,
      accountNumber: bankInfo.accountNumber,
      accountHolder: bankInfo.accountHolder,
    })
    .where(eq(users.id, ownerId));
}


// ========== Payment Methods ==========
export async function getPaymentMethodsByLot(lotId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(paymentMethods).where(eq(paymentMethods.lotId, lotId));
  } catch (error) {
    console.error("[Database] Error getting payment methods:", error);
    return [];
  }
}

export async function setPaymentMethod(data: InsertPaymentMethod) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(paymentMethods).values(data);
  } catch (error) {
    console.error("[Database] Error setting payment method:", error);
    throw error;
  }
}

export async function updatePaymentMethod(id: number, data: Partial<InsertPaymentMethod>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(paymentMethods)
      .set(data)
      .where(eq(paymentMethods.id, id));
  } catch (error) {
    console.error("[Database] Error updating payment method:", error);
    throw error;
  }
}

export async function deletePaymentMethod(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  } catch (error) {
    console.error("[Database] Error deleting payment method:", error);
    throw error;
  }
}

// ========== Payout Schedules ==========
export async function getPayoutSchedulesByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(payoutSchedules)
      .where(eq(payoutSchedules.ownerId, ownerId));
  } catch (error) {
    console.error("[Database] Error getting payout schedules:", error);
    return [];
  }
}

export async function getPayoutSchedulesByLot(lotId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(payoutSchedules)
      .where(eq(payoutSchedules.lotId, lotId));
  } catch (error) {
    console.error("[Database] Error getting payout schedules:", error);
    return [];
  }
}

export async function createPayoutSchedule(data: InsertPayoutSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(payoutSchedules).values(data);
  } catch (error) {
    console.error("[Database] Error creating payout schedule:", error);
    throw error;
  }
}

export async function updatePayoutSchedule(id: number, data: Partial<InsertPayoutSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(payoutSchedules)
      .set(data)
      .where(eq(payoutSchedules.id, id));
  } catch (error) {
    console.error("[Database] Error updating payout schedule:", error);
    throw error;
  }
}


// ========== Owner Management ==========

export async function getOwnerByCustomUrl(customUrl: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(users)
      .where(eq(users.customUrl, customUrl))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting owner by custom URL:", error);
    return null;
  }
}

export async function createOwner(data: { name: string; email: string; customUrl: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(users).values({
      openId: nanoid(),
      name: data.name,
      email: data.email,
      role: "owner",
      status: "active",
      customUrl: data.customUrl,
    });
    return result;
  } catch (error) {
    console.error("[Database] Error creating owner:", error);
    throw error;
  }
}

export async function updateOwnerCustomUrl(ownerId: number, customUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.update(users)
      .set({ customUrl })
      .where(eq(users.id, ownerId));
  } catch (error) {
    console.error("[Database] Error updating owner custom URL:", error);
    throw error;
  }
}

export async function checkCustomUrlExists(customUrl: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const result = await db.select().from(users)
      .where(eq(users.customUrl, customUrl))
      .limit(1);
    return result.length > 0;
  } catch (error) {
    console.error("[Database] Error checking custom URL:", error);
    return false;
  }
}


// ========== 時間帯ごとの最大料金管理 ==========

import { maxPricingPeriods, InsertMaxPricingPeriod, MaxPricingPeriod } from "../drizzle/schema";

// 時間帯ごとの最大料金を保存
export async function saveMaxPricingPeriod(data: {
  parkingLotId: number;
  startHour: number;
  endHour: number;
  maxAmount: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(maxPricingPeriods).values({
    parkingLotId: data.parkingLotId,
    startHour: data.startHour,
    endHour: data.endHour,
    maxAmount: data.maxAmount,
  });

  return Number(result[0].insertId);
}

// 駐車場の時間帯ごとの最大料金一覧取得
export async function getMaxPricingPeriodsByLot(parkingLotId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(maxPricingPeriods)
    .where(eq(maxPricingPeriods.parkingLotId, parkingLotId))
    .orderBy(maxPricingPeriods.startHour);
}

// 時間帯ごとの最大料金を更新
export async function updateMaxPricingPeriod(periodId: number, data: {
  startHour?: number;
  endHour?: number;
  maxAmount?: number;
}) {
  const db = await getDb();
  if (!db) return;

  await db.update(maxPricingPeriods).set(data).where(eq(maxPricingPeriods.id, periodId));
}

// 時間帯ごとの最大料金を削除
export async function deleteMaxPricingPeriod(periodId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(maxPricingPeriods).where(eq(maxPricingPeriods.id, periodId));
}

// 駐車場の時間帯ごとの最大料金をすべて削除
export async function deleteAllMaxPricingPeriodsForLot(parkingLotId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(maxPricingPeriods).where(eq(maxPricingPeriods.parkingLotId, parkingLotId));
}
