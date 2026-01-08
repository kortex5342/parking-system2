import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getUserById: vi.fn(),
  getAdminUser: vi.fn(),
  saveUserStripeApiKeys: vi.fn(),
  disconnectUserStripeApiKeys: vi.fn(),
  saveUserSquareAccessToken: vi.fn(),
  disconnectUserSquare: vi.fn(),
  updateUserPayPayAccount: vi.fn(),
  disconnectUserPayPay: vi.fn(),
  setCardPaymentProvider: vi.fn(),
  updatePricingSettings: vi.fn(),
  getPricingSettings: vi.fn().mockResolvedValue({ unitMinutes: 60, amount: 300 }),
  calculateParkingFeeDynamic: vi.fn(),
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

// Mock paypay module
vi.mock("./paypay", () => ({
  createPayPayQRCode: vi.fn(),
  verifyPayPayCredentials: vi.fn().mockResolvedValue({ success: true }),
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
      headers: { origin: "https://example.com" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("paymentSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPricing", () => {
    it("returns default pricing settings", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.paymentSettings.getPricing();

      expect(result).toEqual({ unitMinutes: 60, amount: 300 });
    });
  });

  describe("updatePricing", () => {
    it("updates pricing settings for admin", async () => {
      const { updatePricingSettings } = await import("./db");
      vi.mocked(updatePricingSettings).mockResolvedValue(undefined);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.paymentSettings.updatePricing({
        unitMinutes: 30,
        amount: 200,
      });

      expect(result).toEqual({ success: true });
      expect(updatePricingSettings).toHaveBeenCalledWith(1, {
        unitMinutes: 30,
        amount: 200,
      });
    });

    it("rejects invalid unit minutes", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.paymentSettings.updatePricing({
          unitMinutes: 5, // Too low
          amount: 200,
        })
      ).rejects.toThrow();
    });
  });

  describe("getAvailableMethods", () => {
    it("returns no methods when admin has no connected services", async () => {
      const { getAdminUser } = await import("./db");
      vi.mocked(getAdminUser).mockResolvedValue(null);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.paymentSettings.getAvailableMethods();

      expect(result).toEqual({ card: null, paypay: false });
    });

    it("returns stripe when stripe is connected and selected", async () => {
      const { getAdminUser } = await import("./db");
      vi.mocked(getAdminUser).mockResolvedValue({
        id: 1,
        openId: "admin",
        name: "Admin",
        email: "admin@test.com",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        stripeConnected: true,
        stripeSecretKey: "sk_test_xxx",
        stripePublishableKey: "pk_test_xxx",
        squareConnected: false,
        squareAccessToken: null,
        squareMerchantId: null,
        paypayConnected: false,
        paypayApiKey: null,
        paypayApiSecret: null,
        paypayMerchantId: null,
        cardPaymentProvider: "stripe",
        pricingUnitMinutes: 60,
        pricingAmount: 300,
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        squareRefreshToken: null,
        squareLocationId: null,
      });

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.paymentSettings.getAvailableMethods();

      expect(result).toEqual({ card: "stripe", paypay: false });
    });
  });
});

describe("stripe", () => {
  describe("getConnectionStatus", () => {
    it("returns not connected when user has no stripe keys", async () => {
      const { getUserById } = await import("./db");
      vi.mocked(getUserById).mockResolvedValue({
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
      });

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.stripe.getConnectionStatus();

      expect(result.connected).toBe(false);
    });
  });
});

describe("square", () => {
  describe("getConnectionStatus", () => {
    it("returns not connected when user has no square token", async () => {
      const { getUserById } = await import("./db");
      vi.mocked(getUserById).mockResolvedValue({
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
      });

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.square.getConnectionStatus();

      expect(result.connected).toBe(false);
    });
  });
});

describe("paypay", () => {
  describe("getConnectionStatus", () => {
    it("returns not connected when user has no paypay credentials", async () => {
      const { getUserById } = await import("./db");
      vi.mocked(getUserById).mockResolvedValue({
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
      });

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.paypay.getConnectionStatus();

      expect(result.connected).toBe(false);
    });
  });

  describe("saveCredentials", () => {
    it("saves valid paypay credentials", async () => {
      const { getUserById, updateUserPayPayAccount } = await import("./db");
      vi.mocked(getUserById).mockResolvedValue({
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
      });
      vi.mocked(updateUserPayPayAccount).mockResolvedValue(undefined);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.paypay.saveCredentials({
        apiKey: "test-api-key-12345",
        apiSecret: "test-api-secret-12345",
        merchantId: "merchant-12345",
      });

      expect(result.success).toBe(true);
      expect(updateUserPayPayAccount).toHaveBeenCalled();
    });
  });
});
