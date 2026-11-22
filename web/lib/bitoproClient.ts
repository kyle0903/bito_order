/**
 * BitoPro API 瀏覽器端用戶端
 *
 * 直接從瀏覽器呼叫 BitoPro（BitoPro 允許 CORS），不經過 Vercel 伺服器：
 * BitoPro 會擋掉雲端機房（如 Vercel / AWS）的 IP，從使用者自己的網路呼叫則不受影響。
 * API Secret 只在瀏覽器內計算簽章，不會傳出去。
 * 參考: https://github.com/bitoex/bitopro-offical-api-docs
 */
import type { Credentials } from '@/hooks/useCredentials';

const BASE_URL = 'https://api.bitopro.com/v3';

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

async function hmacSha384Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-384' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 送出請求；失敗時拋出帶有 BitoPro 回應內容的錯誤 */
async function request(path: string, options: { credentials?: Credentials; method?: string; body?: object } = {}) {
  const { credentials, method = 'GET', body } = options;
  const headers: Record<string, string> = {};
  let bodyText: string | undefined;

  if (credentials) {
    // 有 body 時簽 body；否則簽 { identity, nonce }
    bodyText = body ? JSON.stringify(body) : undefined;
    const payload = toBase64(bodyText ?? JSON.stringify({ identity: credentials.email, nonce: Date.now() }));
    headers['X-BITOPRO-APIKEY'] = credentials.apiKey;
    headers['X-BITOPRO-PAYLOAD'] = payload;
    headers['X-BITOPRO-SIGNATURE'] = await hmacSha384Hex(credentials.apiSecret, payload);
    if (bodyText) headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, { method, headers, body: bodyText, cache: 'no-store' });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // 非 JSON（例如被擋時的 HTML 頁面）
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `BitoPro ${response.status}: ${text.slice(0, 200)}`);
  }
  return data;
}

// ===== 私有 API（需要認證）=====

/** 帳戶餘額，回傳 { data: [{ currency, amount, available, ... }] } */
export function getBalance(credentials: Credentials) {
  return request('/accounts/balance', { credentials });
}

/** 多個交易對的歷史訂單，去重後依建立時間新到舊排序 */
export async function getOrders(credentials: Credentials, pairs: string[]) {
  const targets = pairs.length > 0 ? pairs : ['btc_twd', 'eth_twd', 'ada_twd'];
  const allOrders: any[] = [];

  for (const pair of targets) {
    try {
      const result = await request(`/orders/all/${pair.toLowerCase()}?statusKind=ALL&limit=1000`, { credentials });
      if (Array.isArray(result?.data)) allOrders.push(...result.data);
    } catch (err) {
      // 單一交易對失敗不影響其他交易對
      console.error(`Failed to fetch orders for ${pair}:`, err);
    }
  }

  const unique = Array.from(new Map(allOrders.map(o => [o.id, o])).values());
  unique.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
  return unique;
}

/** 建立訂單，成功回傳含 orderId 的物件 */
export function createOrder(credentials: Credentials, params: {
  pair: string;
  action: 'buy' | 'sell';
  amount: string;
  price?: string;
  type: 'limit' | 'market';
}) {
  return request(`/orders/${params.pair.toLowerCase()}`, {
    credentials,
    method: 'POST',
    body: {
      action: params.action.toUpperCase(),
      amount: parseFloat(params.amount).toFixed(8),
      price: params.price || '0',
      type: params.type.toUpperCase(),
      timestamp: Date.now(),
    },
  });
}

/** 取消訂單 */
export function cancelOrder(credentials: Credentials, pair: string, orderId: string) {
  return request(`/orders/${pair.toLowerCase()}/${orderId}`, { credentials, method: 'DELETE' });
}

// ===== 公開 API =====

/** 單一交易對行情，回傳 { data: { lastPrice, priceChange24hr, ... } } */
export function getTicker(pair: string) {
  return request(`/tickers/${pair.toLowerCase()}`);
}

/** 所有 TWD 交易對行情 */
export async function getTwdTickers() {
  const result = await request('/tickers');
  return (result?.data || []).filter((ticker: { pair: string }) => ticker.pair.endsWith('_twd'));
}
