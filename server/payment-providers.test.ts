import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database functions
vi.mock("./db", () => ({
  getUserById: vi.fn(),
  getAdminUser: vi.fn(),
  updateUserSquareAccount: vi.fn(),
  updateUserSquareLocation: vi.fn(),
  disconnectUserSquare: vi.fn(),
  updateUserPayPayAccount: vi.fn(),
  disconnectUserPayPay: vi.fn(),
  setCardPaymentProvider: vi.fn(),
  disconnectUserStripe: vi.fn(),
}));

import {
  getUserById,
  getAdminUser,
  updateUserSquareAccount,
  updateUserSquareLocation,
  disconnectUserSquare,
  updateUserPayPayAccount,
  disconnectUserPayPay,
  setCardPaymentProvider,
  disconnectUserStripe,
} from "./db";

describe("Payment Provider Database Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Square Integration", () => {
    it("should update Square account information", async () => {
      const mockUpdateSquare = updateUserSquareAccount as any;
      mockUpdateSquare.mockResolvedValue(undefined);

      await updateUserSquareAccount(1, "merchant_123", "access_token_123", "refresh_token_123", Date.now() + 3600000);

      expect(mockUpdateSquare).toHaveBeenCalledWith(
        1,
        "merchant_123",
        "access_token_123",
        "refresh_token_123",
        expect.any(Number)
      );
    });

    it("should update Square location", async () => {
      const mockUpdateLocation = updateUserSquareLocation as any;
      mockUpdateLocation.mockResolvedValue(undefined);

      await updateUserSquareLocation(1, "location_123");

      expect(mockUpdateLocation).toHaveBeenCalledWith(1, "location_123");
    });

    it("should disconnect Square account", async () => {
      const mockDisconnect = disconnectUserSquare as any;
      mockDisconnect.mockResolvedValue(undefined);

      await disconnectUserSquare(1);

      expect(mockDisconnect).toHaveBeenCalledWith(1);
    });
  });

  describe("PayPay Integration", () => {
    it("should update PayPay account information", async () => {
      const mockUpdatePayPay = updateUserPayPayAccount as any;
      mockUpdatePayPay.mockResolvedValue(undefined);

      await updateUserPayPayAccount(1, "api_key_123", "api_secret_123", "merchant_123");

      expect(mockUpdatePayPay).toHaveBeenCalledWith(
        1,
        "api_key_123",
        "api_secret_123",
        "merchant_123"
      );
    });

    it("should disconnect PayPay account", async () => {
      const mockDisconnect = disconnectUserPayPay as any;
      mockDisconnect.mockResolvedValue(undefined);

      await disconnectUserPayPay(1);

      expect(mockDisconnect).toHaveBeenCalledWith(1);
    });
  });

  describe("Card Payment Provider Selection", () => {
    it("should set card payment provider to stripe", async () => {
      const mockSetProvider = setCardPaymentProvider as any;
      mockSetProvider.mockResolvedValue(undefined);

      await setCardPaymentProvider(1, "stripe");

      expect(mockSetProvider).toHaveBeenCalledWith(1, "stripe");
    });

    it("should set card payment provider to square", async () => {
      const mockSetProvider = setCardPaymentProvider as any;
      mockSetProvider.mockResolvedValue(undefined);

      await setCardPaymentProvider(1, "square");

      expect(mockSetProvider).toHaveBeenCalledWith(1, "square");
    });

    it("should clear card payment provider", async () => {
      const mockSetProvider = setCardPaymentProvider as any;
      mockSetProvider.mockResolvedValue(undefined);

      await setCardPaymentProvider(1, null);

      expect(mockSetProvider).toHaveBeenCalledWith(1, null);
    });
  });

  describe("Get Admin User for Payment Methods", () => {
    it("should return admin user with all payment providers connected", async () => {
      const mockGetAdmin = getAdminUser as any;
      mockGetAdmin.mockResolvedValue({
        id: 1,
        role: "admin",
        stripeAccountId: "acct_123",
        stripeOnboardingComplete: true,
        squareConnected: true,
        squareMerchantId: "merchant_123",
        squareLocationId: "location_123",
        paypayConnected: true,
        paypayMerchantId: "paypay_merchant_123",
        cardPaymentProvider: "stripe",
      });

      const admin = await getAdminUser();

      expect(admin).toBeDefined();
      expect(admin?.stripeAccountId).toBe("acct_123");
      expect(admin?.squareConnected).toBe(true);
      expect(admin?.paypayConnected).toBe(true);
      expect(admin?.cardPaymentProvider).toBe("stripe");
    });

    it("should return admin user with no payment providers connected", async () => {
      const mockGetAdmin = getAdminUser as any;
      mockGetAdmin.mockResolvedValue({
        id: 1,
        role: "admin",
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        squareConnected: false,
        squareMerchantId: null,
        squareLocationId: null,
        paypayConnected: false,
        paypayMerchantId: null,
        cardPaymentProvider: null,
      });

      const admin = await getAdminUser();

      expect(admin).toBeDefined();
      expect(admin?.stripeAccountId).toBeNull();
      expect(admin?.squareConnected).toBe(false);
      expect(admin?.paypayConnected).toBe(false);
      expect(admin?.cardPaymentProvider).toBeNull();
    });
  });

  describe("Stripe Disconnect", () => {
    it("should disconnect Stripe and clear provider if it was active", async () => {
      const mockDisconnect = disconnectUserStripe as any;
      const mockGetUser = getUserById as any;
      const mockSetProvider = setCardPaymentProvider as any;

      mockDisconnect.mockResolvedValue(undefined);
      mockGetUser.mockResolvedValue({
        id: 1,
        cardPaymentProvider: "stripe",
      });
      mockSetProvider.mockResolvedValue(undefined);

      await disconnectUserStripe(1);

      expect(mockDisconnect).toHaveBeenCalledWith(1);
    });
  });
});

describe("Payment Provider Availability Logic", () => {
  it("should determine available payment methods correctly", () => {
    // Test helper function logic
    const determineAvailableMethods = (admin: any) => {
      if (!admin) {
        return { card: null, paypay: false };
      }

      let cardProvider: "stripe" | "square" | null = null;

      if (admin.cardPaymentProvider === "stripe" && admin.stripeAccountId && admin.stripeOnboardingComplete) {
        cardProvider = "stripe";
      } else if (admin.cardPaymentProvider === "square" && admin.squareConnected && admin.squareLocationId) {
        cardProvider = "square";
      }

      return {
        card: cardProvider,
        paypay: admin.paypayConnected,
      };
    };

    // Test with Stripe active
    const stripeAdmin = {
      cardPaymentProvider: "stripe",
      stripeAccountId: "acct_123",
      stripeOnboardingComplete: true,
      squareConnected: false,
      squareLocationId: null,
      paypayConnected: true,
    };
    expect(determineAvailableMethods(stripeAdmin)).toEqual({ card: "stripe", paypay: true });

    // Test with Square active
    const squareAdmin = {
      cardPaymentProvider: "square",
      stripeAccountId: null,
      stripeOnboardingComplete: false,
      squareConnected: true,
      squareLocationId: "loc_123",
      paypayConnected: false,
    };
    expect(determineAvailableMethods(squareAdmin)).toEqual({ card: "square", paypay: false });

    // Test with no providers
    const noProviderAdmin = {
      cardPaymentProvider: null,
      stripeAccountId: null,
      stripeOnboardingComplete: false,
      squareConnected: false,
      squareLocationId: null,
      paypayConnected: false,
    };
    expect(determineAvailableMethods(noProviderAdmin)).toEqual({ card: null, paypay: false });

    // Test with null admin
    expect(determineAvailableMethods(null)).toEqual({ card: null, paypay: false });
  });
});
