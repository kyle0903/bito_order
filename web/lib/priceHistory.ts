/**
 * 歷史日線價格，供淨值重建使用（僅限 server 端），皆為未還原的實際成交價
 * - 台股：FinMind（失敗時退回 Yahoo）
 * - 美股、加密貨幣（{代號}-USD）：Yahoo Finance Chart API，乘上當日 USD/TWD（TWD=X）
 * 以 Next.js fetch 快取（revalidate）避免每次重抓
 */
import type { PriceLookup } from './performance';

const REVALIDATE_SECONDS = 6 * 60 * 60;

interface DailySeries {
  dates: string[]; // 遞增
  closes: number[];
  currency: string;
}

/** 依最早日期挑選涵蓋所需期間的最小 range（固定字串，讓快取鍵穩定） */
function pickRange(since: string): string {
  const days = (Date.now() - Date.parse(since)) / 86400000 + 7;
  if (days <= 365) return '1y';
  if (days <= 730) return '2y';
  if (days <= 1825) return '5y';
  if (days <= 3650) return '10y';
  return 'max';
}

async function fetchDaily(symbol: string, range: string): Promise<DailySeries | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}&events=split`,
      {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: REVALIDATE_SECONDS },
      }
    );
    if (!response.ok) return null;
    const result = (await response.json())?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const rawCloses: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];
    const offset: number = result?.meta?.gmtoffset || 0;

    const dates: string[] = [];
    const closes: number[] = [];
    timestamps.forEach((ts, i) => {
      const close = rawCloses[i];
      if (close == null || !(close > 0)) return;
      // 以交易所當地時間決定日期
      const date = new Date((ts + offset) * 1000).toISOString().slice(0, 10);
      if (dates[dates.length - 1] === date) {
        closes[closes.length - 1] = close; // 同日重複（盤中最新價）取後者
      } else {
        dates.push(date);
        closes.push(close);
      }
    });
    if (dates.length === 0) return null;

    // Yahoo 的 close 已做分割還原；還原回當時的實際價格，才能對上帳本中分割前的股數
    const splits = Object.values(result?.events?.splits || {}) as { date: number; numerator: number; denominator: number }[];
    for (const split of splits) {
      const ratio = split.numerator / split.denominator;
      if (!(ratio > 0)) continue;
      const splitDate = new Date((split.date + offset) * 1000).toISOString().slice(0, 10);
      dates.forEach((date, i) => {
        if (date < splitDate) closes[i] *= ratio;
      });
    }

    return { dates, closes, currency: String(result?.meta?.currency || 'USD').toUpperCase() };
  } catch (error) {
    console.warn(`[PriceHistory] ${symbol} failed:`, error);
    return null;
  }
}

/**
 * 台股未還原日線（FinMind）：Yahoo 的台股價格已做分割還原卻不提供分割事件（如 0050 於 2025/6 一拆四），
 * 會讓分割前的持股被低估，因此台股優先使用 FinMind 的實際成交價
 */
async function fetchTaiwanDaily(symbol: string, since: string): Promise<DailySeries | null> {
  const stockId = symbol.replace(/\.TWO?$/, '');
  try {
    const response = await fetch(
      `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${encodeURIComponent(stockId)}&start_date=${since}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: REVALIDATE_SECONDS } }
    );
    if (!response.ok) return null;
    const rows: { date: string; close: number }[] = (await response.json())?.data || [];
    const valid = rows.filter(r => r.close > 0);
    if (valid.length === 0) return null;
    return { dates: valid.map(r => r.date), closes: valid.map(r => r.close), currency: 'TWD' };
  } catch (error) {
    console.warn(`[PriceHistory] FinMind ${symbol} failed:`, error);
    return null;
  }
}

/** 取 date 當日或之前最近一日的收盤價；date 早於資料起點時回傳 null */
function closeOn(series: DailySeries, date: string): number | null {
  let lo = 0;
  let hi = series.dates.length - 1;
  if (date < series.dates[0]) return null;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (series.dates[mid] <= date) lo = mid;
    else hi = mid - 1;
  }
  return series.closes[lo];
}

/** 帳本代號對應的 Yahoo 代號；TWD 與 USD 另外處理 */
function yahooSymbol(target: string, platform: string): string {
  const symbol = target.toUpperCase();
  if (symbol.endsWith('.TW') || symbol.endsWith('.TWO') || platform === '券商') return symbol;
  return `${symbol}-USD`;
}

/** 預先抓好所需代號的歷史價格，回傳同步查價函式 */
export async function loadPriceLookup(
  holdings: { target: string; platform: string }[],
  since: string
): Promise<PriceLookup> {
  const range = pickRange(since);
  const symbols = new Set<string>();
  for (const h of holdings) {
    const target = h.target.toUpperCase();
    if (target !== 'TWD' && target !== 'USD') symbols.add(yahooSymbol(target, h.platform));
  }

  const [fx, ...results] = await Promise.all([
    fetchDaily('TWD=X', range),
    ...Array.from(symbols).map(async s => {
      const isTaiwan = s.endsWith('.TW') || s.endsWith('.TWO');
      const series = (isTaiwan ? await fetchTaiwanDaily(s, since) : null) || await fetchDaily(s, range);
      return [s, series] as const;
    }),
  ]);
  const histories = new Map(results);

  return (target, platform, date) => {
    const symbol = target.toUpperCase();
    if (symbol === 'TWD') return 1;
    const usdTwd = fx ? closeOn(fx, date) : null;
    if (symbol === 'USD') return usdTwd;

    const series = histories.get(yahooSymbol(symbol, platform));
    const close = series ? closeOn(series, date) : null;
    if (close === null) return null;
    if (series!.currency === 'TWD') return close;
    return usdTwd === null ? null : close * usdTwd;
  };
}
