import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    openId: "admin",
    name: "Admin",
    email: "admin@test.com",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    stripeConnected: false,
    stripeSecretKey: null,
    stripePublishableKey: null,
    squareConnected: false,
    squareAccessToken: null,
    squareMerchantId: null,
    paypayConnected: false,
    paypayApiKey: null,
    paypayApiSecret: null,
    paypayMerchantId: null,
    cardPaymentProvider: null,
    pricingUnitMinutes: 60,
    pricingAmount: 300,
    stripeAccountId: null,
    stripeOnboardingComplete: false,
    squareRefreshToken: null,
    squareLocationId: null,
  }),
  getAdminUser: vi.fn().mockResolvedValue(null),
  saveUserStripeApiKeys: vi.fn(),
  disconnectUserStripeApiKeys: vi.fn(),
  getPricingSettings: vi.fn().mockResolvedValue({ unitMinutes: 60, amount: 300 }),
  initializeParkingSpaces: vi.fn(),
  getAllParkingSpaces: vi.fn().mockResolvedValue([]),
  getParkingSpaceByQrCode: vi.fn(),
  getParkingSpaceByNumber: vi.fn(),
  createParkingRecord: vi.fn(),
  getParkingRecordByToken: vi.fn(),
  getActiveParkingRecordBySpaceId: vi.fn(),
  completeParkingRecord: vi.fn(),
  updateParkingSpaceStatus: vi.fn(),
  createPaymentRecord: vi.fn(),
  completePayment: vi.fn(),
  getAllActiveParkingRecords: vi.fn().mockResolvedValue([]),
  getAllPaymentRecords: vi.fn().mockResolvedValue([]),
  calculateParkingFee: vi.fn(),
  createPaymentRecordFull: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {
        origin: "https://example.com",
      },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("stripe.getConnectionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.stripe.getConnectionStatus()).rejects.toThrow();
  });

  it("returns connection status for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stripe.getConnectionStatus();

    expect(result).toHaveProperty("connected");
    expect(typeof result.connected).toBe("boolean");
  });
});

describe("stripe.saveApiKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.stripe.saveApiKeys({
        secretKey: "sk_test_xxx",
        publishableKey: "pk_test_xxx",
      })
    ).rejects.toThrow();
  });

  it("validates secret key format", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.stripe.saveApiKeys({
        secretKey: "invalid",
        publishableKey: "pk_test_xxx",
      })
    ).rejects.toThrow();
  });

  it("validates publishable key format", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.stripe.saveApiKeys({
        secretKey: "sk_test_xxx",
        publishableKey: "invalid",
      })
    ).rejects.toThrow();
  });
});

describe("stripe.disconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.stripe.disconnect()).rejects.toThrow();
  });

  it("disconnects stripe for admin users", async () => {
    const { disconnectUserStripeApiKeys } = await import("./db");
    vi.mocked(disconnectUserStripeApiKeys).mockResolvedValue(undefined);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stripe.disconnect();

    expect(result).toEqual({ success: true });
    expect(disconnectUserStripeApiKeys).toHaveBeenCalledWith(1);
  });
});
