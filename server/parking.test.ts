import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { calculateParkingFee } from "./db";

// モックユーザー
const mockAdminUser = {
  id: 1,
  openId: "admin-user",
  email: "admin@example.com",
  name: "Admin User",
  loginMethod: "manus",
  role: "admin" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockRegularUser = {
  id: 2,
  openId: "regular-user",
  email: "user@example.com",
  name: "Regular User",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// コンテキスト作成ヘルパー
function createContext(user: typeof mockAdminUser | typeof mockRegularUser | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("料金計算", () => {
  it("1時間未満は300円", () => {
    const entryTime = Date.now();
    const exitTime = entryTime + 30 * 60 * 1000; // 30分後
    const { amount, durationMinutes } = calculateParkingFee(entryTime, exitTime);
    
    expect(durationMinutes).toBe(30);
    expect(amount).toBe(300);
  });

  it("1時間ちょうどは300円", () => {
    const entryTime = Date.now();
    const exitTime = entryTime + 60 * 60 * 1000; // 1時間後
    const { amount, durationMinutes } = calculateParkingFee(entryTime, exitTime);
    
    expect(durationMinutes).toBe(60);
    expect(amount).toBe(300);
  });

  it("1時間1分は600円（端数切り上げ）", () => {
    const entryTime = Date.now();
    const exitTime = entryTime + 61 * 60 * 1000; // 1時間1分後
    const { amount, durationMinutes } = calculateParkingFee(entryTime, exitTime);
    
    expect(durationMinutes).toBe(61);
    expect(amount).toBe(600);
  });

  it("2時間は600円", () => {
    const entryTime = Date.now();
    const exitTime = entryTime + 120 * 60 * 1000; // 2時間後
    const { amount, durationMinutes } = calculateParkingFee(entryTime, exitTime);
    
    expect(durationMinutes).toBe(120);
    expect(amount).toBe(600);
  });

  it("3時間30分は1200円", () => {
    const entryTime = Date.now();
    const exitTime = entryTime + 210 * 60 * 1000; // 3時間30分後
    const { amount, durationMinutes } = calculateParkingFee(entryTime, exitTime);
    
    expect(durationMinutes).toBe(210);
    expect(amount).toBe(1200); // 4時間分
  });
});

describe("認証チェック", () => {
  it("管理者APIは未認証ユーザーを拒否する", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getDashboard()).rejects.toThrow();
  });

  it("管理者APIは一般ユーザーを拒否する", async () => {
    const ctx = createContext(mockRegularUser);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getDashboard()).rejects.toThrow("管理者権限が必要です");
  });
});

describe("公開API", () => {
  it("auth.meは未認証時にnullを返す", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.meは認証時にユーザー情報を返す", async () => {
    const ctx = createContext(mockAdminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toEqual(mockAdminUser);
  });
});
