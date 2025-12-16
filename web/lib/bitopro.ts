import crypto from 'crypto';

const API_BASE = 'https://api.bitopro.com/v3';

interface BitoProConfig {
  apiKey: string;
  apiSecret: string;
}

class BitoProAPI {
  private apiKey: string;
  private apiSecret: string;

  constructor(config: BitoProConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  private generateSignature(payload: string): string {
    const hmac = crypto.createHmac('sha384', this.apiSecret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  private async request(
    method: string,
    endpoint: string,
    body?: any,
    requiresAuth = false
  ): Promise<any> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      const nonce = Date.now().toString();
      const payload = method === 'GET' ? nonce : nonce + JSON.stringify(body);
      const signature = this.generateSignature(payload);

      headers['X-BITOPRO-APIKEY'] = this.apiKey;
      headers['X-BITOPRO-PAYLOAD'] = payload;
      headers['X-BITOPRO-SIGNATURE'] = signature;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // 獲取帳戶餘額
  async getAccountBalance() {
    return this.request('GET', '/accounts/balance', undefined, true);
  }

  // 獲取交易對資訊
  async getTradingPairs() {
    return this.request('GET', '/provisioning/trading-pairs');
  }

  // 獲取訂單簿
  async getOrderBook(pair: string) {
    return this.request('GET', `/order-book/${pair}`);
  }

  // 獲取最新成交價
  async getTicker(pair: string) {
    return this.request('GET', `/tickers/${pair}`);
  }

  // 建立訂單
  async createOrder(params: {
    pair: string;
    action: 'buy' | 'sell';
    amount: string;
    price?: string;
    type: 'limit' | 'market';
  }) {
    const body = {
      pair: params.pair,
      action: params.action,
      amount: params.amount,
      price: params.price,
      type: params.type,
      timestamp: Date.now(),
    };

    return this.request('POST', '/orders', body, true);
  }

  // 取消訂單
  async cancelOrder(orderId: string, pair: string) {
    return this.request(
      'DELETE',
      `/orders/${pair}/${orderId}`,
      undefined,
      true
    );
  }

  // 獲取訂單歷史
  async getOrderHistory(pair?: string) {
    const endpoint = pair ? `/orders/history/${pair}` : '/orders/history';
    return this.request('GET', endpoint, undefined, true);
  }

  // 獲取活躍訂單
  async getActiveOrders(pair?: string) {
    const endpoint = pair ? `/orders/${pair}` : '/orders';
    return this.request('GET', endpoint, undefined, true);
  }
}

export default BitoProAPI;
