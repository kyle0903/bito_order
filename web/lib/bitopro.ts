// 使用官方 bitopro-api-node SDK
// 參考: https://github.com/bitoex/bitopro-api-node
const BitoPro = require('bitopro-api-node');

interface BitoProConfig {
  apiKey: string;
  apiSecret: string;
  email: string;
}

class BitoProAPI {
  private client: any;

  constructor(config: BitoProConfig) {
    // 根據官方 SDK 初始化方式
    this.client = new BitoPro(config.apiKey, config.apiSecret, config.email);
  }

  // 獲取帳戶餘額
  async getAccountBalance() {
    return this.client.getAccountBalances();
  }

  // 獲取交易對資訊 (透過 getTickers 取得所有交易對)
  async getTradingPairs() {
    return this.client.getTickers();
  }

  // 獲取訂單簿
  async getOrderBook(pair: string) {
    return this.client.getOrderBook(pair);
  }

  // 獲取最新成交價
  async getTicker(pair: string) {
    return this.client.getTickers(pair);
  }

  // 獲取成交紀錄
  async getTrades(pair: string) {
    return this.client.getTrades(pair);
  }

  // 建立訂單
  async createOrder(params: {
    pair: string;
    action: 'buy' | 'sell';
    amount: string;
    price?: string;
    type: 'limit' | 'market';
  }) {
    const order = {
      pair: params.pair,
      action: params.action,
      amount: params.amount,
      price: params.price,
      timestamp: Date.now(),
      type: params.type,
    };

    return this.client.createOrder(order);
  }

  // 取消訂單
  async cancelOrder(orderId: string, pair: string) {
    return this.client.cancelOrder(pair, orderId);
  }

  // 獲取單一訂單
  async getOrder(pair: string, orderId: string) {
    return this.client.getOrder(pair, orderId);
  }

  // 獲取訂單歷史
  async getOrderHistory() {
    return this.client.getOrderHistory();
  }

  // 獲取活躍訂單
  async getActiveOrders(pair: string, activeOnly = true, page = 1) {
    return this.client.getOrders(pair, activeOnly, page);
  }
}

export default BitoProAPI;
