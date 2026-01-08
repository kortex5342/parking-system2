import Stripe from 'stripe';
import { ENV } from './_core/env';

// Stripe クライアント初期化
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Stripe Connect: アカウントリンク作成（オンボーディング用）
export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string | null> {
  if (!stripe) return null;

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

// Stripe Connect: Connected Account 作成
export async function createConnectedAccount(email: string): Promise<string | null> {
  if (!stripe) return null;

  const account = await stripe.accounts.create({
    type: 'standard',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  return account.id;
}

// Stripe Connect: アカウント情報取得
export async function getConnectedAccount(accountId: string): Promise<Stripe.Account | null> {
  if (!stripe) return null;

  try {
    return await stripe.accounts.retrieve(accountId);
  } catch (error) {
    console.error('[Stripe] Failed to retrieve account:', error);
    return null;
  }
}

// Stripe Connect: アカウントが有効か確認
export async function isAccountReady(accountId: string): Promise<boolean> {
  const account = await getConnectedAccount(accountId);
  if (!account) return false;

  return account.charges_enabled && account.payouts_enabled;
}

// Stripe: PaymentIntent 作成（Connected Account への支払い）
export async function createPaymentIntent(
  amount: number, // 円
  connectedAccountId: string,
  metadata: Record<string, string>
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  if (!stripe) return null;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount, // 日本円はそのまま
    currency: 'jpy',
    automatic_payment_methods: {
      enabled: true,
    },
    transfer_data: {
      destination: connectedAccountId,
    },
    metadata,
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

// Stripe: Checkout Session 作成（Connected Account への支払い）
export async function createCheckoutSession(
  amount: number,
  connectedAccountId: string,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
): Promise<string | null> {
  if (!stripe) return null;

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
    payment_intent_data: {
      transfer_data: {
        destination: connectedAccountId,
      },
      metadata,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });

  return session.url;
}

// Stripeが利用可能かチェック
export function isStripeAvailable(): boolean {
  return stripe !== null;
}
