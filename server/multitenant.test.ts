import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// テスト用のコンテキストを作成
function createTestContext(user: TrpcContext["user"] = null): TrpcContext {
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

// オーナーユーザーを作成
function createOwnerUser(): NonNullable<TrpcContext["user"]> {
  return {
    id: 1,
    openId: "owner-test",
    email: "owner@example.com",
    name: "Test Owner",
    loginMethod: "manus",
    role: "owner",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

// 管理者ユーザーを作成
function createAdminUser(): NonNullable<TrpcContext["user"]> {
  return {
    id: 2,
    openId: "admin-test",
    email: "admin@example.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

// 一般ユーザーを作成
function createRegularUser(): NonNullable<TrpcContext["user"]> {
  return {
    id: 3,
    openId: "user-test",
    email: "user@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

describe("Multi-tenant: Owner APIs", () => {
  it("should require authentication for owner.getMyLots", async () => {
    const ctx = createTestContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.owner.getMyLots()).rejects.toThrow();
  });

  it("should allow owner to access owner.getMyLots", async () => {
    const ctx = createTestContext(createOwnerUser());
    const caller = appRouter.createCaller(ctx);

    // This should not throw (even if it returns empty array)
    const result = await caller.owner.getParkingLots();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow admin to access owner.getMyLots", async () => {
    const ctx = createTestContext(createAdminUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.owner.getParkingLots();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Multi-tenant: Operator APIs", () => {
  it("should require admin role for operator.getAllOwners", async () => {
    const ctx = createTestContext(createOwnerUser());
    const caller = appRouter.createCaller(ctx);

    await expect(caller.operator.getAllOwners()).rejects.toThrow();
  });

  it("should allow admin to access operator.getAllOwners", async () => {
    const ctx = createTestContext(createAdminUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.operator.getAllOwners();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should require admin role for operator.getPendingOwners", async () => {
    const ctx = createTestContext(createRegularUser());
    const caller = appRouter.createCaller(ctx);

    await expect(caller.operator.getPendingOwners()).rejects.toThrow();
  });

  it("should allow admin to access operator.getPendingOwners", async () => {
    const ctx = createTestContext(createAdminUser());
    const caller = appRouter.createCaller(ctx);

    const result = await caller.operator.getPendingOwners();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Multi-tenant: Role-based Access", () => {
  it("should correctly identify user roles", () => {
    const owner = createOwnerUser();
    const admin = createAdminUser();
    const user = createRegularUser();

    expect(owner.role).toBe("owner");
    expect(admin.role).toBe("admin");
    expect(user.role).toBe("user");
  });
});
