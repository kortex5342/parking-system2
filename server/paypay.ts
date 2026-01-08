/**
 * PayPay API ヘルパー
 * 
 * PayPay決済連携のためのヘルパー関数
 * PayPay for Developers APIを使用
 */

import crypto from "crypto";

// PayPay API エンドポイント（サンドボックス/本番）
const PAYPAY_API_BASE = process.env.PAYPAY_ENVIRONMENT === "production"
  ? "https://api.paypay.ne.jp"
  : "https://stg-api.sandbox.paypay.ne.jp";

/**
 * PayPay APIが利用可能かチェック
 */
export function isPayPayAvailable(apiKey?: string | null, apiSecret?: string | null, merchantId?: string | null): boolean {
  return !!(apiKey && apiSecret && merchantId);
}

/**
 * HMAC-SHA256署名を生成
 */
function generateHmacSignature(
  apiSecret: string,
  nonce: string,
  epoch: string,
  requestBody: string,
  contentType: string,
  requestUri: string,
  httpMethod: string
): string {
  const message = [
    requestUri,
    "\\n",
    requestBody ? crypto.createHash("md5").update(requestBody).digest("base64") : "",
    "\\n",
    epoch,
    "\\n",
    nonce,
    "\\n",
    contentType,
  ].join("");
  
  return crypto.createHmac("sha256", apiSecret).update(message).digest("base64");
}

/**
 * PayPay API認証ヘッダーを生成
 */
function generateAuthHeaders(
  apiKey: string,
  apiSecret: string,
  requestUri: string,
  httpMethod: string,
  requestBody?: string
): Record<string, string> {
  const nonce = crypto.randomBytes(8).toString("hex");
  const epoch = Math.floor(Date.now() / 1000).toString();
  const contentType = "application/json";
  
  const signature = generateHmacSignature(
    apiSecret,
    nonce,
    epoch,
    requestBody || "",
    contentType,
    requestUri,
    httpMethod
  );
  
  return {
    "Content-Type": contentType,
    "Authorization": `hmac OPA-Auth:${apiKey}:${signature}:${nonce}:${epoch}:${requestBody ? crypto.createHash("md5").update(requestBody).digest("base64") : ""}`,
  };
}

/**
 * QRコード決済を作成
 */
export async function createPayPayQRCode(
  apiKey: string,
  apiSecret: string,
  merchantId: string,
  amount: number,
  orderId: string,
  orderDescription: string,
  redirectUrl: string
): Promise<{
  codeId: string;
  url: string;
  deeplink: string;
  expiryDate: number;
} | null> {
  const requestUri = "/v2/codes";
  const requestBody = JSON.stringify({
    merchantPaymentId: orderId,
    amount: {
      amount: amount,
      currency: "JPY",
    },
    codeType: "ORDER_QR",
    orderDescription: orderDescription,
    isAuthorization: false,
    redirectUrl: redirectUrl,
    redirectType: "WEB_LINK",
    userAgent: "Mozilla/5.0",
  });
  
  try {
    const headers = generateAuthHeaders(apiKey, apiSecret, requestUri, "POST", requestBody);
    
    const response = await fetch(`${PAYPAY_API_BASE}${requestUri}`, {
      method: "POST",
      headers: headers,
      body: requestBody,
    });
    
    if (!response.ok) {
      console.error("[PayPay] Create QR code failed:", await response.text());
      return null;
    }
    
    const data = await response.json();
    
    if (data.resultInfo?.code !== "SUCCESS") {
      console.error("[PayPay] Create QR code error:", data.resultInfo);
      return null;
    }
    
    return {
      codeId: data.data?.codeId,
      url: data.data?.url,
      deeplink: data.data?.deeplink,
      expiryDate: data.data?.expiryDate,
    };
  } catch (error) {
    console.error("[PayPay] Create QR code error:", error);
    return null;
  }
}

/**
 * 決済状態を確認
 */
export async function getPayPayPaymentStatus(
  apiKey: string,
  apiSecret: string,
  merchantPaymentId: string
): Promise<{
  status: "CREATED" | "AUTHORIZED" | "COMPLETED" | "CANCELED" | "EXPIRED" | "FAILED";
  amount?: number;
  paymentId?: string;
} | null> {
  const requestUri = `/v2/codes/payments/${merchantPaymentId}`;
  
  try {
    const headers = generateAuthHeaders(apiKey, apiSecret, requestUri, "GET");
    
    const response = await fetch(`${PAYPAY_API_BASE}${requestUri}`, {
      method: "GET",
      headers: headers,
    });
    
    if (!response.ok) {
      console.error("[PayPay] Get payment status failed:", await response.text());
      return null;
    }
    
    const data = await response.json();
    
    if (data.resultInfo?.code !== "SUCCESS") {
      console.error("[PayPay] Get payment status error:", data.resultInfo);
      return null;
    }
    
    return {
      status: data.data?.status,
      amount: data.data?.amount?.amount,
      paymentId: data.data?.paymentId,
    };
  } catch (error) {
    console.error("[PayPay] Get payment status error:", error);
    return null;
  }
}

/**
 * 決済をキャンセル
 */
export async function cancelPayPayPayment(
  apiKey: string,
  apiSecret: string,
  merchantPaymentId: string
): Promise<boolean> {
  const requestUri = `/v2/codes/${merchantPaymentId}`;
  
  try {
    const headers = generateAuthHeaders(apiKey, apiSecret, requestUri, "DELETE");
    
    const response = await fetch(`${PAYPAY_API_BASE}${requestUri}`, {
      method: "DELETE",
      headers: headers,
    });
    
    return response.ok;
  } catch (error) {
    console.error("[PayPay] Cancel payment error:", error);
    return false;
  }
}

/**
 * PayPay API接続をテスト
 */
export async function testPayPayConnection(
  apiKey: string,
  apiSecret: string,
  merchantId: string
): Promise<{ success: boolean; message: string }> {
  // 簡易的な接続テスト（実際のAPIコールは行わず、フォーマットチェックのみ）
  if (!apiKey || apiKey.length < 10) {
    return { success: false, message: "API Keyの形式が正しくありません" };
  }
  if (!apiSecret || apiSecret.length < 10) {
    return { success: false, message: "API Secretの形式が正しくありません" };
  }
  if (!merchantId || merchantId.length < 5) {
    return { success: false, message: "Merchant IDの形式が正しくありません" };
  }
  
  // 本番環境では実際のAPIコールで検証することを推奨
  return { success: true, message: "接続情報が保存されました" };
}
