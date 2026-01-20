/**
 * 楽天ペイ API ヘルパー
 * 
 * 楽天ペイ オンライン決済 API v2を使用
 * https://webpay.rakuten.co.jp/
 */

import crypto from 'crypto';

// 楽天ペイ API設定
interface RakutenPayConfig {
  serviceId: string;
  licenseKey: string;
  isSandbox?: boolean;
}

// 決済リクエスト
interface ChargeRequest {
  orderNumber: string;
  amount: number;
  itemName: string;
  callbackUrl: string;
  cancelUrl: string;
  customerInfo?: {
    email?: string;
    phone?: string;
  };
}

// 決済レスポンス
interface ChargeResponse {
  resultCode: string;
  resultMessage: string;
  chargeId?: string;
  paymentUrl?: string;
  orderNumber?: string;
}

// 決済確認レスポンス
interface CaptureResponse {
  resultCode: string;
  resultMessage: string;
  chargeId?: string;
  orderNumber?: string;
  amount?: number;
  status?: string;
}

export class RakutenPayClient {
  private serviceId: string;
  private licenseKey: string;
  private baseUrl: string;

  constructor(config: RakutenPayConfig) {
    this.serviceId = config.serviceId;
    this.licenseKey = config.licenseKey;
    this.baseUrl = config.isSandbox
      ? 'https://stg-payment.rakuten.co.jp/api/v2'
      : 'https://payment.rakuten.co.jp/api/v2';
  }

  /**
   * 認証ヘッダーを生成
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.serviceId}:${this.licenseKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * APIリクエストを送信
   */
  private async request<T>(method: string, path: string, body?: object): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': this.getAuthHeader(),
    };

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Rakuten Pay API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * 決済をリクエスト
   */
  async createCharge(params: ChargeRequest): Promise<ChargeResponse> {
    const requestBody = {
      serviceId: this.serviceId,
      orderNumber: params.orderNumber,
      amount: params.amount,
      itemName: params.itemName,
      callbackUrl: params.callbackUrl,
      cancelUrl: params.cancelUrl,
      customerInfo: params.customerInfo,
    };

    return this.request<ChargeResponse>('POST', '/charge', requestBody);
  }

  /**
   * 決済を確定（オーソリ後のキャプチャ）
   */
  async captureCharge(chargeId: string, amount?: number): Promise<CaptureResponse> {
    const requestBody: { chargeId: string; amount?: number } = {
      chargeId,
    };
    if (amount !== undefined) {
      requestBody.amount = amount;
    }

    return this.request<CaptureResponse>('POST', '/capture', requestBody);
  }

  /**
   * 決済をキャンセル
   */
  async cancelCharge(chargeId: string): Promise<{ resultCode: string; resultMessage: string }> {
    return this.request('POST', '/cancel', { chargeId });
  }

  /**
   * 決済詳細を取得
   */
  async getChargeDetails(chargeId: string): Promise<{
    resultCode: string;
    resultMessage: string;
    chargeId?: string;
    orderNumber?: string;
    amount?: number;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
  }> {
    return this.request('GET', `/charge/${chargeId}`);
  }

  /**
   * 注文番号で決済を検索
   */
  async findChargeByOrderNumber(orderNumber: string): Promise<{
    resultCode: string;
    resultMessage: string;
    charges?: Array<{
      chargeId: string;
      orderNumber: string;
      amount: number;
      status: string;
    }>;
  }> {
    return this.request('GET', `/charges?orderNumber=${encodeURIComponent(orderNumber)}`);
  }
}

/**
 * 楽天ペイ決済セッションを作成
 */
export async function createRakutenPaySession(params: {
  serviceId: string;
  licenseKey: string;
  amount: number;
  orderNumber: string;
  itemName: string;
  callbackUrl: string;
  cancelUrl: string;
  isSandbox?: boolean;
}): Promise<{
  success: boolean;
  paymentUrl?: string;
  chargeId?: string;
  error?: string;
}> {
  try {
    const client = new RakutenPayClient({
      serviceId: params.serviceId,
      licenseKey: params.licenseKey,
      isSandbox: params.isSandbox ?? true,
    });

    const response = await client.createCharge({
      orderNumber: params.orderNumber,
      amount: params.amount,
      itemName: params.itemName,
      callbackUrl: params.callbackUrl,
      cancelUrl: params.cancelUrl,
    });

    if (response.resultCode === '0' && response.paymentUrl) {
      return {
        success: true,
        paymentUrl: response.paymentUrl,
        chargeId: response.chargeId,
      };
    }

    return {
      success: false,
      error: response.resultMessage,
    };
  } catch (error) {
    console.error('Rakuten Pay session creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 楽天ペイ決済を確定
 */
export async function captureRakutenPayPayment(params: {
  serviceId: string;
  licenseKey: string;
  chargeId: string;
  amount?: number;
  isSandbox?: boolean;
}): Promise<{
  success: boolean;
  orderNumber?: string;
  error?: string;
}> {
  try {
    const client = new RakutenPayClient({
      serviceId: params.serviceId,
      licenseKey: params.licenseKey,
      isSandbox: params.isSandbox ?? true,
    });

    const response = await client.captureCharge(params.chargeId, params.amount);

    if (response.resultCode === '0') {
      return {
        success: true,
        orderNumber: response.orderNumber,
      };
    }

    return {
      success: false,
      error: response.resultMessage,
    };
  } catch (error) {
    console.error('Rakuten Pay capture error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 楽天ペイ決済をキャンセル
 */
export async function cancelRakutenPayPayment(params: {
  serviceId: string;
  licenseKey: string;
  chargeId: string;
  isSandbox?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = new RakutenPayClient({
      serviceId: params.serviceId,
      licenseKey: params.licenseKey,
      isSandbox: params.isSandbox ?? true,
    });

    const response = await client.cancelCharge(params.chargeId);

    if (response.resultCode === '0') {
      return { success: true };
    }

    return {
      success: false,
      error: response.resultMessage,
    };
  } catch (error) {
    console.error('Rakuten Pay cancel error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
