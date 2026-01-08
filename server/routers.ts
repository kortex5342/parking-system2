import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
  updateUserStripeAccount,
  updateUserStripeOnboardingComplete,
  getUserById,
  getAdminUser,
  createPaymentRecordWithStripe,
  updateUserSquareAccount,
  updateUserSquareLocation,
  disconnectUserSquare,
  updateUserPayPayAccount,
  disconnectUserPayPay,
  setCardPaymentProvider,
  disconnectUserStripe,
  createPaymentRecordFull,
} from "./db";
import {
  stripe,
  createConnectedAccount,
  createAccountLink,
  getConnectedAccount,
  isAccountReady,
  createCheckoutSession,
  isStripeAvailable,
} from "./stripe";
import {
  isSquareAvailable,
  getSquareOAuthUrl,
  exchangeSquareCode,
  getSquareLocations,
  createSquareCheckoutLink,
  revokeSquareToken,
} from "./square";
import {
  isPayPayAvailable,
  createPayPayQRCode,
  getPayPayPaymentStatus,
  testPayPayConnection,
} from "./paypay";

// 管理者専用プロシージャ
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
  }
  return next({ ctx });
});

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
    // 初期化（10台分のスペース作成）
    initialize: publicProcedure.mutation(async () => {
      await initializeParkingSpaces();
      return { success: true };
    }),

    // 全スペース取得
    getAllSpaces: publicProcedure.query(async () => {
      return await getAllParkingSpaces();
    }),

    // QRコードでスペース情報取得
    getSpaceByQrCode: publicProcedure
      .input(z.object({ qrCode: z.string() }))
      .query(async ({ input }) => {
        const space = await getParkingSpaceByQrCode(input.qrCode);
        if (!space) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '駐車スペースが見つかりません' });
        }
        
        // アクティブな入庫記録があるか確認
        const activeRecord = await getActiveParkingRecordBySpaceId(space.id);
        
        return {
          space,
          activeRecord,
          canEnter: space.status === 'available',
          canExit: space.status === 'occupied' && activeRecord !== null,
        };
      }),

    // スペース番号でスペース情報取得
    getSpaceByNumber: publicProcedure
      .input(z.object({ spaceNumber: z.number().min(1).max(10) }))
      .query(async ({ input }) => {
        const space = await getParkingSpaceByNumber(input.spaceNumber);
        if (!space) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '駐車スペースが見つかりません' });
        }
        
        const activeRecord = await getActiveParkingRecordBySpaceId(space.id);
        
        return {
          space,
          activeRecord,
          canEnter: space.status === 'available',
          canExit: space.status === 'occupied' && activeRecord !== null,
        };
      }),

    // 入庫登録
    enter: publicProcedure
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
        
        return {
          success: true,
          sessionToken,
          spaceNumber: space.spaceNumber,
          entryTime: Date.now(),
        };
      }),

    // 出庫・料金計算
    calculateExit: publicProcedure
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
        const { durationMinutes, amount } = calculateParkingFee(record.entryTime, exitTime);
        
        return {
          record,
          exitTime,
          durationMinutes,
          amount,
        };
      }),

    // 決済処理（デモ）
    processPayment: publicProcedure
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
        const { durationMinutes, amount } = calculateParkingFee(record.entryTime, exitTime);
        
        // 決済記録作成
        const paymentId = await createPaymentRecord({
          parkingRecordId: record.id,
          spaceNumber: record.spaceNumber,
          entryTime: record.entryTime,
          exitTime,
          durationMinutes,
          amount,
          paymentMethod: input.paymentMethod,
        });
        
        // デモ決済：常に成功とする
        await completePayment(paymentId);
        
        // 入庫記録を完了に更新
        await completeParkingRecord(record.id, exitTime);
        
        // スペースを空きに更新
        await updateParkingSpaceStatus(record.spaceId, 'available');
        
        return {
          success: true,
          paymentId,
          amount,
          durationMinutes,
          paymentMethod: input.paymentMethod,
        };
      }),

    // セッショントークンで入庫記録取得
    getRecordByToken: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const record = await getParkingRecordByToken(input.sessionToken);
        if (!record) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '入庫記録が見つかりません' });
        }
        return record;
      }),
  }),

  // 管理者用API
  admin: router({
    // 全スペースと入庫状況取得
    getDashboard: adminProcedure.query(async () => {
      const spaces = await getAllParkingSpaces();
      const activeRecords = await getAllActiveParkingRecords();
      
      // スペースごとにアクティブな入庫記録をマッピング
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

  // Stripe Connect API
  stripe: router({
    // Stripeが利用可能か確認
    isAvailable: publicProcedure.query(() => {
      return { available: isStripeAvailable() };
    }),

    // 管理者のStripe接続状態取得
    getConnectionStatus: adminProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        return { connected: false, onboardingComplete: false, accountId: null };
      }

      if (!user.stripeAccountId) {
        return { connected: false, onboardingComplete: false, accountId: null };
      }

      // Stripeアカウントの状態を確認
      const accountReady = await isAccountReady(user.stripeAccountId);
      
      // オンボーディング完了状態を更新
      if (accountReady && !user.stripeOnboardingComplete) {
        await updateUserStripeOnboardingComplete(ctx.user.id, true);
      }

      return {
        connected: true,
        onboardingComplete: accountReady,
        accountId: user.stripeAccountId,
      };
    }),

    // Stripe Connectアカウント作成・オンボーディング開始
    startOnboarding: adminProcedure.mutation(async ({ ctx }) => {
      if (!stripe) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripeが設定されていません' });
      }

      const user = await getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'ユーザーが見つかりません' });
      }

      let accountId = user.stripeAccountId;

      // アカウントがない場合は作成
      if (!accountId) {
        accountId = await createConnectedAccount(user.email || `admin-${user.id}@parking.local`);
        if (!accountId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripeアカウントの作成に失敗しました' });
        }
        await updateUserStripeAccount(ctx.user.id, accountId, false);
      }

      // オンボーディングリンク作成
      const origin = ctx.req.headers.origin || 'http://localhost:3000';
      const accountLinkUrl = await createAccountLink(
        accountId,
        `${origin}/admin?stripe=refresh`,
        `${origin}/admin?stripe=complete`
      );

      if (!accountLinkUrl) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'オンボーディングリンクの作成に失敗しました' });
      }

      return { url: accountLinkUrl };
    }),

    // 公開用: 管理者のStripe接続状態確認（決済可能か）
    isPaymentEnabled: publicProcedure.query(async () => {
      const admin = await getAdminUser();
      if (!admin || !admin.stripeAccountId) {
        return { enabled: false, reason: 'Stripeが接続されていません' };
      }

      const accountReady = await isAccountReady(admin.stripeAccountId);
      if (!accountReady) {
        return { enabled: false, reason: 'Stripeアカウントの設定が完了していません' };
      }

      return { enabled: true, reason: null };
    }),

    // Checkout Session作成（実決済用）
    createCheckout: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 管理者のStripeアカウント取得
        const admin = await getAdminUser();
        if (!admin || !admin.stripeAccountId) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripeが接続されていません' });
        }

        const accountReady = await isAccountReady(admin.stripeAccountId);
        if (!accountReady) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripeアカウントの設定が完了していません' });
        }

        // 入庫記録取得
        const record = await getParkingRecordByToken(input.sessionToken);
        if (!record) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '入庫記録が見つかりません' });
        }

        if (record.status === 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'この入庫記録は既に精算済みです' });
        }

        const exitTime = Date.now();
        const { durationMinutes, amount } = calculateParkingFee(record.entryTime, exitTime);

        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        const durationStr = hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;

        const checkoutUrl = await createCheckoutSession(
          amount,
          admin.stripeAccountId,
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

        return {
          checkoutUrl,
          amount,
          durationMinutes,
        };
      }),
  }),

  // Square API
  square: router({
    // Squareが利用可能か確認
    isAvailable: publicProcedure.query(() => {
      return { available: isSquareAvailable() };
    }),

    // 管理者のSquare接続状態取得
    getConnectionStatus: adminProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        return { connected: false, merchantId: null, locationId: null, locations: [] };
      }

      if (!user.squareConnected || !user.squareAccessToken) {
        return { connected: false, merchantId: null, locationId: null, locations: [] };
      }

      // ロケーション一覧を取得
      const locations = await getSquareLocations(user.squareAccessToken) || [];

      return {
        connected: true,
        merchantId: user.squareMerchantId,
        locationId: user.squareLocationId,
        locations,
      };
    }),

    // Square OAuth認証URL取得
    getOAuthUrl: adminProcedure.mutation(async ({ ctx }) => {
      const origin = ctx.req.headers.origin || 'http://localhost:3000';
      const redirectUri = `${origin}/admin?square=callback`;
      const state = `square-${ctx.user.id}-${Date.now()}`;
      
      const url = getSquareOAuthUrl(redirectUri, state);
      if (!url) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Squareが設定されていません' });
      }

      return { url, state };
    }),

    // Square OAuthコールバック処理
    handleCallback: adminProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        const redirectUri = `${origin}/admin?square=callback`;

        const tokenData = await exchangeSquareCode(input.code, redirectUri);
        if (!tokenData) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Square認証に失敗しました' });
        }

        // ロケーション一覧を取得
        const locations = await getSquareLocations(tokenData.accessToken) || [];
        const defaultLocation = locations.find(l => l.status === 'ACTIVE')?.id || locations[0]?.id;

        await updateUserSquareAccount(ctx.user.id, {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          merchantId: tokenData.merchantId,
          locationId: defaultLocation,
        });

        // Squareをカード決済プロバイダーとして設定
        await setCardPaymentProvider(ctx.user.id, 'square');

        return { success: true, merchantId: tokenData.merchantId, locations };
      }),

    // ロケーション設定
    setLocation: adminProcedure
      .input(z.object({ locationId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await updateUserSquareLocation(ctx.user.id, input.locationId);
        return { success: true };
      }),

    // Square接続解除
    disconnect: adminProcedure.mutation(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (user?.squareAccessToken) {
        await revokeSquareToken(user.squareAccessToken);
      }
      await disconnectUserSquare(ctx.user.id);
      
      // カード決済プロバイダーをクリア
      const updatedUser = await getUserById(ctx.user.id);
      if (updatedUser?.cardPaymentProvider === 'square') {
        await setCardPaymentProvider(ctx.user.id, null);
      }

      return { success: true };
    }),

    // 公開用: Square決済が有効か
    isPaymentEnabled: publicProcedure.query(async () => {
      const admin = await getAdminUser();
      if (!admin || !admin.squareConnected || !admin.squareLocationId) {
        return { enabled: false, reason: 'Squareが接続されていません' };
      }
      return { enabled: true, reason: null };
    }),

    // Square Checkout作成
    createCheckout: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const admin = await getAdminUser();
        if (!admin || !admin.squareConnected || !admin.squareAccessToken || !admin.squareLocationId) {
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
        const { durationMinutes, amount } = calculateParkingFee(record.entryTime, exitTime);

        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        const result = await createSquareCheckoutLink(
          admin.squareAccessToken,
          admin.squareLocationId,
          amount,
          `${origin}/scan?payment=success&token=${input.sessionToken}`,
          `${origin}/scan?payment=cancel&token=${input.sessionToken}`,
          {
            sessionToken: input.sessionToken,
            spaceNumber: record.spaceNumber.toString(),
          }
        );

        if (!result) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Square Checkoutの作成に失敗しました' });
        }

        return {
          checkoutUrl: result.checkoutUrl,
          orderId: result.orderId,
          amount,
          durationMinutes,
        };
      }),
  }),

  // PayPay API
  paypay: router({
    // PayPay接続状態取得
    getConnectionStatus: adminProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        return { connected: false, merchantId: null };
      }

      return {
        connected: user.paypayConnected,
        merchantId: user.paypayMerchantId,
      };
    }),

    // PayPay API情報を保存
    saveCredentials: adminProcedure
      .input(z.object({
        apiKey: z.string().min(1),
        apiSecret: z.string().min(1),
        merchantId: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // 接続テスト
        const testResult = await testPayPayConnection(input.apiKey, input.apiSecret, input.merchantId);
        if (!testResult.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: testResult.message });
        }

        await updateUserPayPayAccount(ctx.user.id, {
          apiKey: input.apiKey,
          apiSecret: input.apiSecret,
          merchantId: input.merchantId,
        });

        return { success: true, message: testResult.message };
      }),

    // PayPay接続解除
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
        const { durationMinutes, amount } = calculateParkingFee(record.entryTime, exitTime);

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
          stripe: { connected: false, onboardingComplete: false },
          square: { connected: false },
          paypay: { connected: false },
          cardPaymentProvider: null,
        };
      }

      let stripeOnboardingComplete = user.stripeOnboardingComplete;
      if (user.stripeAccountId && !stripeOnboardingComplete) {
        stripeOnboardingComplete = await isAccountReady(user.stripeAccountId);
      }

      return {
        stripe: {
          connected: !!user.stripeAccountId,
          onboardingComplete: stripeOnboardingComplete,
        },
        square: {
          connected: user.squareConnected,
          merchantId: user.squareMerchantId,
          locationId: user.squareLocationId,
        },
        paypay: {
          connected: user.paypayConnected,
          merchantId: user.paypayMerchantId,
        },
        cardPaymentProvider: user.cardPaymentProvider,
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

        // 選択したプロバイダーが接続されているか確認
        if (input.provider === 'stripe') {
          if (!user.stripeAccountId || !user.stripeOnboardingComplete) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Stripeが接続されていません' });
          }
        } else if (input.provider === 'square') {
          if (!user.squareConnected) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Squareが接続されていません' });
          }
        }

        await setCardPaymentProvider(ctx.user.id, input.provider);
        return { success: true };
      }),

    // Stripe接続解除
    disconnectStripe: adminProcedure.mutation(async ({ ctx }) => {
      await disconnectUserStripe(ctx.user.id);
      
      // カード決済プロバイダーをクリア
      const user = await getUserById(ctx.user.id);
      if (user?.cardPaymentProvider === 'stripe') {
        await setCardPaymentProvider(ctx.user.id, null);
      }

      return { success: true };
    }),

    // 公開用: 利用可能な決済方法一覧
    getAvailableMethods: publicProcedure.query(async () => {
      const admin = await getAdminUser();
      if (!admin) {
        return { card: null, paypay: false };
      }

      let cardProvider: 'stripe' | 'square' | null = null;
      
      if (admin.cardPaymentProvider === 'stripe' && admin.stripeAccountId && admin.stripeOnboardingComplete) {
        const accountReady = await isAccountReady(admin.stripeAccountId);
        if (accountReady) cardProvider = 'stripe';
      } else if (admin.cardPaymentProvider === 'square' && admin.squareConnected && admin.squareLocationId) {
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
