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
} from "./db";

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
});

export type AppRouter = typeof appRouter;
