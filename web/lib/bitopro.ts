// 直接使用 BitoPro REST API
// 參考: https://github.com/bitoex/bitopro-offical-api-docs
import crypto from 'crypto';

const BASE_URL = 'https://api.bitopro.com/v3';

interface BitoProConfig {
  apiKey: string;
  apiSecret: string;
  email: string;
}

class BitoProAPI {
  private apiKey: string;
  private apiSecret: string;
  private email: string;

  constructor(config: BitoProConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.email = config.email;
  }

  // 生成認證 headers
  private generateAuthHeaders(body?: object) {
    const payload = body 
      ? Buffer.from(JSON.stringify(body)).toString('base64')
      : Buffer.from(JSON.stringify({ identity: this.email, nonce: Date.now() })).toString('base64');
    
    const signature = crypto
      .createHmac('sha384', this.apiSecret)
      .update(payload)
      .digest('hex');

    return {
      'X-BITOPRO-APIKEY': this.apiKey,
      'X-BITOPRO-PAYLOAD': payload,
      'X-BITOPRO-SIGNATURE': signature,
      'Content-Type': 'application/json',
    };
  }

  // ===== 私有 API（需要認證）=====

  // 獲取帳戶餘額
  async getAccountBalance() {
    const response = await fetch(`${BASE_URL}/accounts/balance`, {
      method: 'GET',
      headers: this.generateAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.status}`);
    }
    
    return response.json();
  }

  // 獲取所有訂單（包含歷史）
  // BitoPro API 限制：startTimestamp 和 endTimestamp 最多相差 90 天
  async getAllOrders(
    pair: string, 
    statusKind: 'ALL' | 'OPEN' | 'DONE' = 'ALL', 
    limit: number = 100,
    startTimestamp?: number,
    endTimestamp?: number
  ) {
    let url = `${BASE_URL}/orders/all/${pair}?statusKind=${statusKind}&limit=${limit}`;
    
    if (startTimestamp) {
      url += `&startTimestamp=${startTimestamp}`;
    }
    if (endTimestamp) {
      url += `&endTimestamp=${endTimestamp}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.generateAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`);
    }
    
    return response.json();
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
      ...params,
      timestamp: Date.now(),
    };

    const response = await fetch(`${BASE_URL}/orders/${params.pair}`, {
      method: 'POST',
      headers: this.generateAuthHeaders(body),
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create order: ${response.status}`);
    }
    
    return response.json();
  }

  // 取消訂單
  async cancelOrder(pair: string, orderId: string) {
    const response = await fetch(`${BASE_URL}/orders/${pair}/${orderId}`, {
      method: 'DELETE',
      headers: this.generateAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cancel order: ${response.status}`);
    }
    
    return response.json();
  }

  // 獲取單一訂單
  async getOrder(pair: string, orderId: string) {
    const response = await fetch(`${BASE_URL}/orders/${pair}/${orderId}`, {
      method: 'GET',
      headers: this.generateAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get order: ${response.status}`);
    }
    
    return response.json();
  }

  // ===== 公開 API（不需要認證）=====

  // 獲取交易對資訊
  static async getTradingPairs() {
    const response = await fetch(`${BASE_URL}/tickers`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch trading pairs: ${response.status}`);
    }
    
    return response.json();
  }

  // 獲取最新成交價
  static async getTicker(pair: string) {
    const response = await fetch(`${BASE_URL}/tickers/${pair}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ticker: ${response.status}`);
    }
    
    return response.json();
  }

  // 獲取訂單簿
  static async getOrderBook(pair: string, limit: number = 5) {
    const response = await fetch(`${BASE_URL}/order-book/${pair}?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch order book: ${response.status}`);
    }
    
    return response.json();
  }

  // 獲取成交紀錄
  static async getTrades(pair: string) {
    const response = await fetch(`${BASE_URL}/trades/${pair}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch trades: ${response.status}`);
    }
    
    return response.json();
  }
}

export default BitoProAPI;


