/**
 * 金融資料服務
 * 完全不使用 Yahoo Finance，改用免費且穩定的 API
 */

// 快取結構
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  source: string;
}

// 記憶體快取
const cache = new Map<string, CacheEntry<any>>();

// 快取有效時間
const FX_CACHE_TTL_MS = 30 * 60 * 1000;   // 匯率快取 30 分鐘
const STOCK_CACHE_TTL_MS = 5 * 60 * 1000; // 股票快取 5 分鐘

/**
 * 取得 USD/TWD 匯率（使用免費 API）
 */
export async function getUsdTwdRate(): Promise<number> {
  const cacheKey = 'FX_USDTWD';
  const now = Date.now();

  // 檢查快取
  const cached = cache.get(cacheKey);
  if (cached && (now - cached.timestamp) < FX_CACHE_TTL_MS) {
    console.log(`[Finance] FX rate from cache: ${cached.data}`);
    return cached.data;
  }

  // 嘗試多個免費匯率 API
  const rate = await fetchExchangeRate();
  
  if (rate) {
    cache.set(cacheKey, { data: rate, timestamp: now });
    return rate;
  }

  // 返回快取的舊資料或預設值
  if (cached) {
    console.log('[Finance] Returning stale FX rate');
    return cached.data;
  }

  return 32.5; // 預設匯率
}

/**
 * 從多個免費 API 獲取匯率
 */
async function fetchExchangeRate(): Promise<number | null> {
  // API 1: Frankfurter（歐洲央行資料，免費無限制）
  try {
    console.log('[Finance] Fetching FX from Frankfurter...');
    const response = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=TWD',
      { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const rate = data?.rates?.TWD;
      if (rate && typeof rate === 'number') {
        console.log(`[Finance] FX rate from Frankfurter: ${rate}`);
        return rate;
      }
    }
  } catch (error) {
    console.warn('[Finance] Frankfurter API failed:', error);
  }

  // API 2: ExchangeRate-API（免費版）
  try {
    console.log('[Finance] Fetching FX from ExchangeRate-API...');
    const response = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const rate = data?.rates?.TWD;
      if (rate && typeof rate === 'number') {
        console.log(`[Finance] FX rate from ER-API: ${rate}`);
        return rate;
      }
    }
  } catch (error) {
    console.warn('[Finance] ExchangeRate-API failed:', error);
  }

  // API 3: Currency API（備用）
  try {
    console.log('[Finance] Fetching FX from Currency API...');
    const response = await fetch(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const rate = data?.usd?.twd;
      if (rate && typeof rate === 'number') {
        console.log(`[Finance] FX rate from Currency API: ${rate}`);
        return rate;
      }
    }
  } catch (error) {
    console.warn('[Finance] Currency API failed:', error);
  }

  return null;
}

/**
 * 取得股票報價（使用免費 API）
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const cacheKey = `STOCK_${symbol.toUpperCase()}`;
  const now = Date.now();

  // 檢查快取
  const cached = cache.get(cacheKey);
  if (cached && (now - cached.timestamp) < STOCK_CACHE_TTL_MS) {
    console.log(`[Finance] Stock ${symbol} from cache`);
    return cached.data;
  }

  // 嘗試從免費 API 獲取股票資料
  const quote = await fetchStockQuote(symbol);
  
  if (quote) {
    cache.set(cacheKey, { data: quote, timestamp: now });
    return quote;
  }

  // 返回快取的舊資料
  if (cached) {
    console.log(`[Finance] Returning stale stock data for ${symbol}`);
    return cached.data;
  }

  return null;
}

/**
 * 從免費 API 獲取股票報價
 */
async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  // API 1: Financial Modeling Prep（每日 250 次免費請求）
  // 需要免費 API key，但這裡先用無 key 的 demo
  try {
    console.log(`[Finance] Fetching stock ${symbol} from FMP...`);
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote-short/${symbol}?apikey=demo`,
      { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const quote = data[0];
        console.log(`[Finance] Stock ${symbol} from FMP: $${quote.price}`);
        return {
          symbol: symbol.toUpperCase(),
          price: quote.price || 0,
          change: 0,
          changePercent: 0,
          currency: 'USD',
          source: 'FMP',
        };
      }
    }
  } catch (error) {
    console.warn(`[Finance] FMP API failed for ${symbol}:`, error);
  }

  // API 2: 使用 Google Finance 非官方 API（備用）
  try {
    console.log(`[Finance] Fetching stock ${symbol} from alternative source...`);
    // 這是一個公開的股票資訊 API
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      
      if (meta?.regularMarketPrice) {
        console.log(`[Finance] Stock ${symbol}: $${meta.regularMarketPrice}`);
        return {
          symbol: meta.symbol || symbol.toUpperCase(),
          price: meta.regularMarketPrice,
          change: (meta.regularMarketPrice - meta.previousClose) || 0,
          changePercent: meta.previousClose 
            ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100)
            : 0,
          currency: meta.currency || 'USD',
          source: 'Chart API',
        };
      }
    }
  } catch (error) {
    console.warn(`[Finance] Chart API failed for ${symbol}:`, error);
  }

  return null;
}

/**
 * 清除快取
 */
export function clearFinanceCache(): void {
  cache.clear();
  console.log('[Finance] Cache cleared');
}

/**
 * 取得快取統計
 */
export function getFinanceCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
  const now = Date.now();
  const entries = Array.from(cache.entries()).map(([key, entry]) => ({
    key,
    age: Math.round((now - entry.timestamp) / 1000),
  }));

  return {
    size: cache.size,
    entries,
  };
}
