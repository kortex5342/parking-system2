/**
 * LINE Pay API v3 ヘルパー
 * 
 * LINE Pay API v3を使用してQRコード決済を実装
 * https://pay.line.me/developers/apis/onlineApis
 */

import crypto from 'crypto';

// LINE Pay API設定
interface LinePayConfig {
  channelId: string;
  channelSecret: string;
  isSandbox?: boolean;
}

// 決済リクエスト
interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  packages: {
    id: string;
    amount: number;
    name: string;
    products: {
      name: string;
      quantity: number;
      price: number;
    }[];
  }[];
  redirectUrls: {
    confirmUrl: string;
    cancelUrl: string;
  };
}

// 決済レスポンス
interface PaymentResponse {
  returnCode: string;
  returnMessage: string;
  info?: {
    paymentUrl: {
      web: string;
      app: string;
    };
    transactionId: string;
    paymentAccessToken: string;
  };
}

// 確認レスポンス
interface ConfirmResponse {
  returnCode: string;
  returnMessage: string;
  info?: {
    transactionId: string;
    orderId: string;
    payInfo: {
      method: string;
      amount: number;
    }[];
  };
}

export class LinePayClient {
  private channelId: string;
  private channelSecret: string;
  private baseUrl: string;

  constructor(config: LinePayConfig) {
    this.channelId = config.channelId;
    this.channelSecret = config.channelSecret;
    this.baseUrl = config.isSandbox 
      ? 'https://sandbox-api-pay.line.me'
      : 'https://api-pay.line.me';
  }

  /**
   * HMAC-SHA256署名を生成
   */
  private generateSignature(requestUri: string, requestBody: string, nonce: string): string {
    const message = this.channelSecret + requestUri + requestBody + nonce;
    return crypto
      .createHmac('sha256', this.channelSecret)
      .update(message)
      .digest('base64');
  }

  /**
   * APIリクエストを送信
   */
  private async request<T>(method: string, path: string, body?: object): Promise<T> {
    const nonce = crypto.randomUUID();
    const requestBody = body ? JSON.stringify(body) : '';
    const signature = this.generateSignature(path, requestBody, nonce);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': this.channelId,
      'X-LINE-Authorization-Nonce': nonce,
      'X-LINE-Authorization': signature,
    };

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: method !== 'GET' ? requestBody : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LINE Pay API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * 決済をリクエスト（QRコード生成）
   */
  async requestPayment(params: {
    amount: number;
    orderId: string;
    productName: string;
    confirmUrl: string;
    cancelUrl: string;
  }): Promise<PaymentResponse> {
    const requestBody: PaymentRequest = {
      amount: params.amount,
      currency: 'JPY',
      orderId: params.orderId,
      packages: [
        {
          id: 'parking',
          amount: params.amount,
          name: '駐車料金',
          products: [
            {
              name: params.productName,
              quantity: 1,
              price: params.amount,
            },
          ],
        },
      ],
      redirectUrls: {
        confirmUrl: params.confirmUrl,
        cancelUrl: params.cancelUrl,
      },
    };

    return this.request<PaymentResponse>('POST', '/v3/payments/request', requestBody);
  }

  /**
   * 決済を確認（ユーザーが承認後に呼び出す）
   */
  async confirmPayment(transactionId: string, amount: number): Promise<ConfirmResponse> {
    const requestBody = {
      amount,
      currency: 'JPY',
    };

    return this.request<ConfirmResponse>(
      'POST',
      `/v3/payments/requests/${transactionId}/confirm`,
      requestBody
    );
  }

  /**
   * 決済をキャンセル
   */
  async voidPayment(transactionId: string): Promise<{ returnCode: string; returnMessage: string }> {
    return this.request('POST', `/v3/payments/requests/${transactionId}/void`);
  }

  /**
   * 決済詳細を取得
   */
  async getPaymentDetails(transactionId: string): Promise<{
    returnCode: string;
    returnMessage: string;
    info?: {
      transactionId: string;
      transactionDate: string;
      transactionType: string;
      payStatus: string;
      productName: string;
      merchantName: string;
      currency: string;
      authorizationExpireDate: string;
      payInfo: {
        method: string;
        amount: number;
      }[];
    }[];
  }> {
    return this.request('GET', `/v3/payments/requests/${transactionId}/check`);
  }
}

/**
 * LINE Pay決済セッションを作成
 */
export async function createLinePaySession(params: {
  channelId: string;
  channelSecret: string;
  amount: number;
  orderId: string;
  productName: string;
  confirmUrl: string;
  cancelUrl: string;
  isSandbox?: boolean;
}): Promise<{
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}> {
  try {
    const client = new LinePayClient({
      channelId: params.channelId,
      channelSecret: params.channelSecret,
      isSandbox: params.isSandbox ?? true,
    });

    const response = await client.requestPayment({
      amount: params.amount,
      orderId: params.orderId,
      productName: params.productName,
      confirmUrl: params.confirmUrl,
      cancelUrl: params.cancelUrl,
    });

    if (response.returnCode === '0000' && response.info) {
      return {
        success: true,
        paymentUrl: response.info.paymentUrl.web,
        transactionId: response.info.transactionId,
      };
    }

    return {
      success: false,
      error: response.returnMessage,
    };
  } catch (error) {
    console.error('LINE Pay session creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * LINE Pay決済を確認
 */
export async function confirmLinePayPayment(params: {
  channelId: string;
  channelSecret: string;
  transactionId: string;
  amount: number;
  isSandbox?: boolean;
}): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
}> {
  try {
    const client = new LinePayClient({
      channelId: params.channelId,
      channelSecret: params.channelSecret,
      isSandbox: params.isSandbox ?? true,
    });

    const response = await client.confirmPayment(params.transactionId, params.amount);

    if (response.returnCode === '0000' && response.info) {
      return {
        success: true,
        orderId: response.info.orderId,
      };
    }

    return {
      success: false,
      error: response.returnMessage,
    };
  } catch (error) {
    console.error('LINE Pay confirmation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
