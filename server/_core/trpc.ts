import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// デモ版: 認証不要、ダミー管理者ユーザーを設定
const DEMO_ADMIN_ID = 999;
const demoAdmin = {
  id: DEMO_ADMIN_ID,
  openId: 'demo-admin',
  name: 'デモ管理者',
  email: 'admin@example.com',
  loginMethod: 'demo',
  role: 'admin' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    // デモ版のため、ダミー管理者を設定
    return next({
      ctx: {
        ...ctx,
        user: ctx.user || demoAdmin,
      },
    });
  }),
);
