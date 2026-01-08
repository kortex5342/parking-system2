import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import {
  initializeParkingSpaces,
  getAllParkingSpaces,
  getParkingSpaceByQrCode,
  getParkingSpaceByNumber,
  createParkingRecord,
  getParkingRecordByToken,
  getActiveParkingRecordBySpaceId,
  completeParkingRecord,
  updateParkingSpaceStatus,
  createPaymentRecord,
  completePayment,
  getAllActiveParkingRecords,
  getAllPaymentRecords,
  calculateParkingFee,
  getUserById,
  getAdminUser,
  createPaymentRecordFull,
  saveUserStripeApiKeys,
  disconnectUserStripeApiKeys,
  saveUserSquareAccessToken,
  disconnectUserSquare,
  updateUserPayPayAccount,
  disconnectUserPayPay,
  setCardPaymentProvider,
  updatePricingSettings,
  getPricingSettings,
  calculateParkingFeeDynamic,
} from "./db";
import {
  createPayPayQRCode,
  verifyPayPayCredentials,
} from "./paypay";

// 管理者専用プロシージャ
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
  }
  return next({ ctx });
});

// Stripe APIキーのテスト
async function testStripeApiKey(secretKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const stripe = new Stripe(secretKey);
    await stripe.balance.retrieve();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Stripe APIキーが無効です' };
  }
}

// Square Access Tokenのテスト
async function testSquareAccessToken(accessToken: string): Promise<{ success: boolean; error?: string; merchantId?: string }> {
  try {
    const response = await fetch('https://connect.squareup.com/v2/merchants/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Square API エラー: ${response.status}` };
    }
    
    const data = await response.json();
    return { success: true, merchantId: data.merchant?.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Square Access Tokenが無効です' };
  }
}

// Stripe Checkout Session作成（直接APIキー使用）
async function createStripeCheckout(
  secretKey: string,
  amount: number,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
): Promise<string | null> {
  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: '駐車料金',
              description: `駐車スペース${metadata.spaceNumber}番 - ${metadata.duration}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });
    return session.url;
  } catch (error) {
    console.error('[Stripe] Checkout creation failed:', error);
    return null;
  }
}

// Square Checkout Link作成
async function createSquareCheckout(
  accessToken: string,
  amount: number,
  successUrl: string,
  metadata: Record<string, string>
): Promise<{ url: string; orderId: string } | null> {
  try {
    // まずロケーションを取得
    const locResponse = await fetch('https://connect.squareup.com/v2/locations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
        'Content-Type': 'application/json',
      },
    });
    
    if (!locResponse.ok) return null;
    const locData = await locResponse.json();
    const locationId = locData.locations?.[0]?.id;
    if (!locationId) return null;

    const idempotencyKey = `parking-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        quick_pay: {
          name: `駐車料金 スペース${metadata.spaceNumber}番`,
          price_money: {
            amount: amount,
            currency: 'JPY',
          },
          location_id: locationId,
        },
        checkout_options: {
          redirect_url: successUrl,
        },
      }),
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return {
      url: data.payment_link?.url,
      orderId: data.payment_link?.order_id,
    };
  } catch (error) {
    console.error('[Square] Checkout creation failed:', error);
    return null;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // 駐車場管理API
  parking: router({
    // 全駐車スペース取得
    getSpaces: publicProcedure.query(async () => {
      return await getAllParkingSpaces();
    }),

    // QRコードで駐車スペース情報取得
    getSpaceByQrCode: publicProcedure
      .input(z.object({ qrCode: z.string() }))
      .query(async ({ input }) => {
        const space = await getParkingSpaceByQrCode(input.qrCode);
        if (!space) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '駐車スペースが見つかりません' });
        }
        
        const activeRecord = await getActiveParkingRecordBySpaceId(space.id);
        const pricing = await getPricingSettings();
        
        return {
          space,
          activeRecord,
          pricing,
        };
      }),

    // 入庫処理
    checkIn: publicProcedure
      .input(z.object({ qrCode: z.string() }))
      .mutation(async ({ input }) => {
        const space = await getParkingSpaceByQrCode(input.qrCode);
        if (!space) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '駐車スペースが見つかりません' });
        }

        if (space.status === 'occupied') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'このスペースは既に使用中です' });
        }

        const sessionToken = await createParkingRecord(space.id, space.spaceNumber);
        await updateParkingSpaceStatus(space.id, 'occupied');

        return {
          success: true,
          sessionToken,
          spaceNumber: space.spaceNumber,
          entryTime: Date.now(),
        };
      }),

    // 出庫情報取得（料金計算）
    getCheckoutInfo: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const record = await getParkingRecordByToken(input.sessionToken);
        if (!record) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '入庫記録が見つかりません' });
        }

        if (record.status === 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'この入庫記録は既に精算済みです' });
        }

        const exitTime = Date.now();
        const { durationMinutes, amount } = await calculateParkingFeeDynamic(record.entryTime, exitTime);
        const pricing = await getPricingSettings();

        return {
          record,
          exitTime,
          durationMinutes,
          amount,
          pricing,
        };
      }),

    // 出庫処理（デモ決済）
    checkOut: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        paymentMethod: z.enum(['paypay', 'credit_card']),
      }))
      .mutation(async ({ input }) => {
        const record = await getParkingRecordByToken(input.sessionToken);
        if (!record) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '入庫記録が見つかりません' });
        }

        if (record.status === 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'この入庫記録は既に精算済みです' });
        }

        const exitTime = Date.now();
        const { durationMinutes, amount } = await calculateParkingFeeDynamic(record.entryTime, exitTime);

        const paymentId = await createPaymentRecord({
          parkingRecordId: record.id,
          spaceNumber: record.spaceNumber,
          entryTime: record.entryTime,
          exitTime,
          durationMinutes,
          amount,
          paymentMethod: input.paymentMethod,
        });

        await completePayment(paymentId);
        await completeParkingRecord(record.id, exitTime);
        
        const space = await getParkingSpaceByNumber(record.spaceNumber);
        if (space) {
          await updateParkingSpaceStatus(space.id, 'available');
        }

        return {
          success: true,
          paymentId,
          amount,
          durationMinutes,
        };
      }),
  }),

  // 管理者API
  admin: router({
    // ダッシュボード情報取得
    getDashboard: adminProcedure.query(async () => {
      const spaces = await getAllParkingSpaces();
      const activeRecords = await getAllActiveParkingRecords();
      
      const spaceRecordMap = new Map(activeRecords.map(r => [r.spaceId, r]));
      
      const spacesWithRecords = spaces.map(space => ({
        ...space,
        activeRecord: spaceRecordMap.get(space.id) || null,
      }));
      
      const occupiedCount = spaces.filter(s => s.status === 'occupied').length;
      const availableCount = spaces.filter(s => s.status === 'available').length;
      
      return {
        spaces: spacesWithRecords,
        summary: {
          total: spaces.length,
          occupied: occupiedCount,
          available: availableCount,
        },
      };
    }),

    // 決済履歴取得
    getPaymentHistory: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(100) }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 100;
        return await getAllPaymentRecords(limit);
      }),

    // 駐車スペース初期化
    initializeSpaces: adminProcedure.mutation(async () => {
      await initializeParkingSpaces();
      return { success: true };
    }),
  }),

  // Stripe API（APIキー直接入力方式）
  stripe: router({
    // 接続状態取得
    getConnectionStatus: adminProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        return { connected: false };
      }
      return {
        connected: user.stripeConnected,
        hasSecretKey: !!user.stripeSecretKey,
        hasPublishableKey: !!user.stripePublishableKey,
      };
    }),

    // APIキー保存（接続テスト付き）
    saveApiKeys: adminProcedure
      .input(z.object({
        secretKey: z.string().min(1),
        publishableKey: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // 接続テスト
        const testResult = await testStripeApiKey(input.secretKey);
        if (!testResult.success) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: testResult.error || 'Stripe APIキーの検証に失敗しました' 
          });
        }

        // 保存
        await saveUserStripeApiKeys(ctx.user.id, {
          secretKey: input.secretKey,
          publishableKey: input.publishableKey,
        });

        return { success: true, message: 'Stripeに接続しました' };
      }),

    // 接続解除
    disconnect: adminProcedure.mutation(async ({ ctx }) => {
      await disconnectUserStripeApiKeys(ctx.user.id);
      
      const user = await getUserById(ctx.user.id);
      if (user?.cardPaymentProvider === 'stripe') {
        await setCardPaymentProvider(ctx.user.id, null);
      }

      return { success: true };
    }),

    // 公開用: Stripe決済が有効か
    isPaymentEnabled: publicProcedure.query(async () => {
      const admin = await getAdminUser();
      if (!admin || !admin.stripeConnected || !admin.stripeSecretKey) {
        return { enabled: false, reason: 'Stripeが接続されていません' };
      }
      return { enabled: true, reason: null };
    }),

    // Checkout Session作成
    createCheckout: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const admin = await getAdminUser();
        if (!admin || !admin.stripeConnected || !admin.stripeSecretKey) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripeが接続されていません' });
        }

        const record = await getParkingRecordByToken(input.sessionToken);
        if (!record) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '入庫記録が見つかりません' });
        }

        if (record.status === 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'この入庫記録は既に精算済みです' });
        }

        const exitTime = Date.now();
        const { durationMinutes, amount } = await calculateParkingFeeDynamic(record.entryTime, exitTime);

        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        const durationStr = hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;

        const checkoutUrl = await createStripeCheckout(
          admin.stripeSecretKey,
          amount,
          `${origin}/scan?payment=success&token=${input.sessionToken}`,
          `${origin}/scan?payment=cancel&token=${input.sessionToken}`,
          {
            sessionToken: input.sessionToken,
            spaceNumber: record.spaceNumber.toString(),
            duration: durationStr,
            parkingRecordId: record.id.toString(),
          }
        );

        if (!checkoutUrl) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Checkoutセッションの作成に失敗しました' });
        }

        return { checkoutUrl, amount, durationMinutes };
      }),
  }),

  // Square API（Access Token直接入力方式）
  square: router({
    // 接続状態取得
    getConnectionStatus: adminProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        return { connected: false };
      }
      return {
        connected: user.squareConnected,
        hasAccessToken: !!user.squareAccessToken,
        merchantId: user.squareMerchantId,
      };
    }),

    // Access Token保存（接続テスト付き）
    saveAccessToken: adminProcedure
      .input(z.object({
        accessToken: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // 接続テスト
        const testResult = await testSquareAccessToken(input.accessToken);
        if (!testResult.success) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: testResult.error || 'Square Access Tokenの検証に失敗しました' 
          });
        }

        // 保存
        await saveUserSquareAccessToken(ctx.user.id, input.accessToken);

        return { success: true, message: 'Squareに接続しました', merchantId: testResult.merchantId };
      }),

    // 接続解除
    disconnect: adminProcedure.mutation(async ({ ctx }) => {
      await disconnectUserSquare(ctx.user.id);
      
      const user = await getUserById(ctx.user.id);
      if (user?.cardPaymentProvider === 'square') {
        await setCardPaymentProvider(ctx.user.id, null);
      }

      return { success: true };
    }),

    // 公開用: Square決済が有効か
    isPaymentEnabled: publicProcedure.query(async () => {
      const admin = await getAdminUser();
      if (!admin || !admin.squareConnected || !admin.squareAccessToken) {
        return { enabled: false, reason: 'Squareが接続されていません' };
      }
      return { enabled: true, reason: null };
    }),

    // Checkout作成
    createCheckout: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const admin = await getAdminUser();
        if (!admin || !admin.squareConnected || !admin.squareAccessToken) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Squareが接続されていません' });
        }

        const record = await getParkingRecordByToken(input.sessionToken);
        if (!record) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '入庫記録が見つかりません' });
        }

        if (record.status === 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'この入庫記録は既に精算済みです' });
        }

        const exitTime = Date.now();
        const { durationMinutes, amount } = await calculateParkingFeeDynamic(record.entryTime, exitTime);

        const origin = ctx.req.headers.origin || 'http://localhost:3000';

        const result = await createSquareCheckout(
          admin.squareAccessToken,
          amount,
          `${origin}/scan?payment=success&token=${input.sessionToken}`,
          { spaceNumber: record.spaceNumber.toString() }
        );

        if (!result) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Square Checkoutの作成に失敗しました' });
        }

        return { checkoutUrl: result.url, orderId: result.orderId, amount, durationMinutes };
      }),
  }),

  // PayPay API
  paypay: router({
    // 接続状態取得
    getConnectionStatus: adminProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        return { connected: false };
      }
      return {
        connected: user.paypayConnected,
        merchantId: user.paypayMerchantId,
      };
    }),

    // 認証情報保存（接続テスト付き）
    saveCredentials: adminProcedure
      .input(z.object({
        apiKey: z.string().min(1),
        apiSecret: z.string().min(1),
        merchantId: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // 接続テスト
        const testResult = await verifyPayPayCredentials(input.apiKey, input.apiSecret, input.merchantId);
        if (!testResult.success) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: testResult.error || 'PayPay認証情報の検証に失敗しました' 
          });
        }

        // 保存
        await updateUserPayPayAccount(ctx.user.id, {
          apiKey: input.apiKey,
          apiSecret: input.apiSecret,
          merchantId: input.merchantId,
        });

        return { success: true, message: 'PayPayに接続しました' };
      }),

    // 接続解除
    disconnect: adminProcedure.mutation(async ({ ctx }) => {
      await disconnectUserPayPay(ctx.user.id);
      return { success: true };
    }),

    // 公開用: PayPay決済が有効か
    isPaymentEnabled: publicProcedure.query(async () => {
      const admin = await getAdminUser();
      if (!admin || !admin.paypayConnected) {
        return { enabled: false, reason: 'PayPayが接続されていません' };
      }
      return { enabled: true, reason: null };
    }),

    // PayPay QRコード決済作成
    createPayment: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const admin = await getAdminUser();
        if (!admin || !admin.paypayConnected || !admin.paypayApiKey || !admin.paypayApiSecret || !admin.paypayMerchantId) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'PayPayが接続されていません' });
        }

        const record = await getParkingRecordByToken(input.sessionToken);
        if (!record) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '入庫記録が見つかりません' });
        }

        if (record.status === 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'この入庫記録は既に精算済みです' });
        }

        const exitTime = Date.now();
        const { durationMinutes, amount } = await calculateParkingFeeDynamic(record.entryTime, exitTime);

        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        const orderId = `PARK-${record.id}-${Date.now()}`;

        const result = await createPayPayQRCode(
          admin.paypayApiKey,
          admin.paypayApiSecret,
          admin.paypayMerchantId,
          amount,
          orderId,
          `駐車料金 スペース${record.spaceNumber}番`,
          `${origin}/scan?payment=success&token=${input.sessionToken}&paypay=true`
        );

        if (!result) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PayPay QRコードの作成に失敗しました' });
        }

        return {
          qrCodeUrl: result.url,
          deeplink: result.deeplink,
          codeId: result.codeId,
          orderId,
          amount,
          durationMinutes,
        };
      }),
  }),

  // 決済設定統合API
  paymentSettings: router({
    // 全決済サービスの接続状態取得
    getAllStatus: adminProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        return {
          stripe: { connected: false },
          square: { connected: false },
          paypay: { connected: false },
          cardPaymentProvider: null,
          pricing: { unitMinutes: 60, amount: 300 },
        };
      }

      return {
        stripe: {
          connected: user.stripeConnected,
        },
        square: {
          connected: user.squareConnected,
          merchantId: user.squareMerchantId,
        },
        paypay: {
          connected: user.paypayConnected,
          merchantId: user.paypayMerchantId,
        },
        cardPaymentProvider: user.cardPaymentProvider,
        pricing: {
          unitMinutes: user.pricingUnitMinutes,
          amount: user.pricingAmount,
        },
      };
    }),

    // カード決済プロバイダーを切り替え
    setCardProvider: adminProcedure
      .input(z.object({ provider: z.enum(['stripe', 'square']) }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'ユーザーが見つかりません' });
        }

        if (input.provider === 'stripe' && !user.stripeConnected) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Stripeが接続されていません' });
        }
        if (input.provider === 'square' && !user.squareConnected) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Squareが接続されていません' });
        }

        await setCardPaymentProvider(ctx.user.id, input.provider);
        return { success: true };
      }),

    // 料金設定を更新
    updatePricing: adminProcedure
      .input(z.object({
        unitMinutes: z.number().min(10).max(60),
        amount: z.number().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await updatePricingSettings(ctx.user.id, {
          unitMinutes: input.unitMinutes,
          amount: input.amount,
        });
        return { success: true };
      }),

    // 料金設定を取得（公開用）
    getPricing: publicProcedure.query(async () => {
      return await getPricingSettings();
    }),

    // 公開用: 利用可能な決済方法一覧
    getAvailableMethods: publicProcedure.query(async () => {
      const admin = await getAdminUser();
      if (!admin) {
        return { card: null, paypay: false };
      }

      let cardProvider: 'stripe' | 'square' | null = null;
      
      if (admin.cardPaymentProvider === 'stripe' && admin.stripeConnected) {
        cardProvider = 'stripe';
      } else if (admin.cardPaymentProvider === 'square' && admin.squareConnected) {
        cardProvider = 'square';
      }

      return {
        card: cardProvider,
        paypay: admin.paypayConnected,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
