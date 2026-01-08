/**
 * Square API ヘルパー
 * 
 * Square決済連携のためのヘルパー関数
 * 注意: Square SDKは使用せず、REST APIを直接呼び出します
 */

import { ENV } from "./_core/env";

// Square API エンドポイント（サンドボックス/本番）
const SQUARE_API_BASE = process.env.SQUARE_ENVIRONMENT === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

// Square OAuth設定
const SQUARE_APP_ID = process.env.SQUARE_APP_ID;
const SQUARE_APP_SECRET = process.env.SQUARE_APP_SECRET;

/**
 * Square APIが利用可能かチェック
 */
export function isSquareAvailable(): boolean {
  return !!(SQUARE_APP_ID && SQUARE_APP_SECRET);
}

/**
 * Square OAuth認証URLを生成
 */
export function getSquareOAuthUrl(redirectUri: string, state: string): string | null {
  if (!SQUARE_APP_ID) return null;
  
  const params = new URLSearchParams({
    client_id: SQUARE_APP_ID,
    scope: "PAYMENTS_WRITE PAYMENTS_READ MERCHANT_PROFILE_READ",
    session: "false",
    state: state,
  });
  
  return `${SQUARE_API_BASE}/oauth2/authorize?${params.toString()}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

/**
 * OAuth認証コードをアクセストークンに交換
 */
export async function exchangeSquareCode(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  merchantId: string;
  expiresAt: string;
} | null> {
  if (!SQUARE_APP_ID || !SQUARE_APP_SECRET) return null;
  
  try {
    const response = await fetch(`${SQUARE_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18",
      },
      body: JSON.stringify({
        client_id: SQUARE_APP_ID,
        client_secret: SQUARE_APP_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    
    if (!response.ok) {
      console.error("[Square] Token exchange failed:", await response.text());
      return null;
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      merchantId: data.merchant_id,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error("[Square] Token exchange error:", error);
    return null;
  }
}

/**
 * アクセストークンをリフレッシュ
 */
export async function refreshSquareToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
} | null> {
  if (!SQUARE_APP_ID || !SQUARE_APP_SECRET) return null;
  
  try {
    const response = await fetch(`${SQUARE_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18",
      },
      body: JSON.stringify({
        client_id: SQUARE_APP_ID,
        client_secret: SQUARE_APP_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    
    if (!response.ok) {
      console.error("[Square] Token refresh failed:", await response.text());
      return null;
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error("[Square] Token refresh error:", error);
    return null;
  }
}

/**
 * マーチャントのロケーション一覧を取得
 */
export async function getSquareLocations(accessToken: string): Promise<Array<{
  id: string;
  name: string;
  status: string;
}> | null> {
  try {
    const response = await fetch(`${SQUARE_API_BASE}/v2/locations`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Square-Version": "2024-01-18",
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      console.error("[Square] Get locations failed:", await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.locations?.map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      status: loc.status,
    })) || [];
  } catch (error) {
    console.error("[Square] Get locations error:", error);
    return null;
  }
}

/**
 * Square Checkout Linkを作成
 */
export async function createSquareCheckoutLink(
  accessToken: string,
  locationId: string,
  amount: number,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
): Promise<{ checkoutUrl: string; orderId: string } | null> {
  try {
    const idempotencyKey = `parking-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const response = await fetch(`${SQUARE_API_BASE}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Square-Version": "2024-01-18",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        quick_pay: {
          name: `駐車料金 スペース${metadata.spaceNumber}番`,
          price_money: {
            amount: amount, // Squareは最小通貨単位（円）
            currency: "JPY",
          },
          location_id: locationId,
        },
        checkout_options: {
          redirect_url: successUrl,
          merchant_support_email: "support@parking.local",
        },
        pre_populated_data: {
          buyer_email: metadata.email || undefined,
        },
      }),
    });
    
    if (!response.ok) {
      console.error("[Square] Create checkout failed:", await response.text());
      return null;
    }
    
    const data = await response.json();
    return {
      checkoutUrl: data.payment_link?.url,
      orderId: data.payment_link?.order_id,
    };
  } catch (error) {
    console.error("[Square] Create checkout error:", error);
    return null;
  }
}

/**
 * OAuth接続を解除
 */
export async function revokeSquareToken(accessToken: string): Promise<boolean> {
  if (!SQUARE_APP_ID || !SQUARE_APP_SECRET) return false;
  
  try {
    const response = await fetch(`${SQUARE_API_BASE}/oauth2/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18",
        "Authorization": `Client ${SQUARE_APP_SECRET}`,
      },
      body: JSON.stringify({
        client_id: SQUARE_APP_ID,
        access_token: accessToken,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error("[Square] Revoke token error:", error);
    return false;
  }
}
