/**
 * 績效計算（純函式）：從帳本重建每日淨值、累計淨投入與 XIRR
 *
 * 現金流以「投資人角度」記錄：投入為負、取回為正
 * - 買入 / 賣出 / 股利：-Amount
 * - 跨分類的轉帳 / 兌換：以轉入端當日市值，來源分類記為取回、目的分類記為投入
 *   （支付分類視為投資組合之外，轉去 Ether.fi 即為從投資組合提領）
 * - 利息 / 調整：無現金流，屬於報酬
 */
import { CATEGORIES, GROUPED_TYPES, PAYMENT_CATEGORY, categorize, positionKey } from './ledger';
import type { AssetCategory, Category, LedgerEntry } from './ledger';

/** 某代號在某日（或之前最近一個交易日）的 TWD 價格；查無資料回傳 null */
export type PriceLookup = (target: string, platform: string, date: string) => number | null;

export interface CashFlow {
  date: string;
  amount: number;
}

export interface DailyPoint {
  date: string;
  value: number; // 淨值（TWD，不含支付分類）
  invested: number; // 累計淨投入（TWD）
}

export interface CategoryPerformance {
  category: Category;
  value: number;
  invested: number;
  contributed: number; // 總投入：所有投入現金流加總（不扣除取回），作為總報酬率的分母
  xirr: number | null;
  since: string; // 第一筆現金流日期
}

export interface PerformanceResult {
  series: DailyPoint[];
  overall: { value: number; invested: number; xirr: number | null; since: string };
  categories: CategoryPerformance[];
  lendingUsd: { xirr: number | null; since: string } | null; // Bitfinex 放貸以 USD 計的年化（不含匯差）
  missingPrices: string[]; // 查不到歷史價格的代號
}

/**
 * Bitfinex 放貸的 USD 年化：只看 Bitfinex 平台上的數量（視 USD / USDT 為 1:1），
 * 轉入為投入、轉出為取回，利息為報酬，今日餘額視為全部取回
 */
function lendingUsdXirr(entries: LedgerEntry[], today: string): { xirr: number | null; since: string } | null {
  const isBfx = (e: LedgerEntry) => e.platform === 'Bitfinex';
  const flows: CashFlow[] = [];
  let balance = 0;
  const groups = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    if (isBfx(e)) balance += e.quantity;
    if (GROUPED_TYPES.includes(e.type) && e.groupId) {
      groups.set(e.groupId, [...(groups.get(e.groupId) || []), e]);
    }
  }
  groups.forEach(legs => {
    // 一端在 Bitfinex、另一端不在：跨平台移轉才是投入 / 取回
    const bfxLegs = legs.filter(isBfx);
    if (bfxLegs.length === 0 || bfxLegs.length === legs.length) return;
    for (const leg of bfxLegs) flows.push({ date: leg.date, amount: -leg.quantity });
  });
  if (flows.length === 0) return null;
  flows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { xirr: xirr([...flows, { date: today, amount: balance }]), since: flows[0].date };
}

const EPSILON = 1e-8;
const DAY_MS = 86400000;

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** XIRR：使 Σ amount / (1 + r)^(年數) = 0 的 r；現金流須同時有正有負，否則回傳 null */
export function xirr(flows: CashFlow[]): number | null {
  const valid = flows.filter(f => Math.abs(f.amount) > EPSILON);
  if (!valid.some(f => f.amount < 0) || !valid.some(f => f.amount > 0)) return null;

  const t0 = Math.min(...valid.map(f => Date.parse(f.date)));
  const points = valid.map(f => ({ t: (Date.parse(f.date) - t0) / (365 * DAY_MS), a: f.amount }));
  const npv = (r: number) => points.reduce((sum, p) => sum + p.a / Math.pow(1 + r, p.t), 0);

  // 二分法：一般投資現金流（先投入後取回）的 NPV 隨 r 遞減
  let lo = -0.9999;
  let hi = 10;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

export function computePerformance(entries: LedgerEntry[], price: PriceLookup, today: string): PerformanceResult {
  const sorted = [...entries].filter(e => e.date && e.date <= today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const missing = new Set<string>();
  const priceOf = (target: string, platform: string, date: string): number => {
    const p = price(target, platform, date);
    if (p === null) {
      missing.add(target);
      return 0;
    }
    return p;
  };

  // 1. 各分類的現金流
  const flows = new Map<AssetCategory, CashFlow[]>();
  const addFlow = (category: AssetCategory, date: string, amount: number) => {
    if (Math.abs(amount) < EPSILON) return;
    if (!flows.has(category)) flows.set(category, []);
    flows.get(category)!.push({ date, amount });
  };

  const handledGroups = new Set<string>();
  for (const entry of sorted) {
    if (GROUPED_TYPES.includes(entry.type) && entry.groupId) {
      if (handledGroups.has(entry.groupId)) continue;
      handledGroups.add(entry.groupId);
      const legs = sorted.filter(e => e.groupId === entry.groupId);
      const out = legs.find(e => e.quantity < 0);
      const inLeg = legs.find(e => e.quantity > 0);
      if (!out || !inLeg) continue;
      const from = categorize(out.target, out.platform);
      const to = categorize(inLeg.target, inLeg.platform);
      if (from === to) continue; // 同分類內移動，不影響分類績效
      // 以轉入端市值計（轉帳手續費算在來源分類的損失）；查無價格時改用轉出端
      let value = inLeg.quantity * priceOf(inLeg.target, inLeg.platform, entry.date);
      if (value <= 0) value = -out.quantity * priceOf(out.target, out.platform, entry.date);
      addFlow(from, entry.date, value);
      addFlow(to, entry.date, -value);
      continue;
    }
    addFlow(categorize(entry.target, entry.platform), entry.date, -entry.amount);
  }

  // 整體：所有非支付分類的現金流加總（分類之間的移轉會互相抵銷）
  const overallFlows: CashFlow[] = [];
  flows.forEach((list, category) => {
    if (category !== PAYMENT_CATEGORY) overallFlows.push(...list);
  });
  const overallFlowByDate = new Map<string, number>();
  for (const f of overallFlows) overallFlowByDate.set(f.date, (overallFlowByDate.get(f.date) || 0) + f.amount);

  // 2. 逐日重建持倉並估值
  const quantities = new Map<string, { target: string; platform: string; quantity: number }>();
  const series: DailyPoint[] = [];
  const categoryValues = new Map<Category, number>();
  let invested = 0;
  let index = 0;

  if (sorted.length > 0) {
    for (let date = sorted[0].date; date <= today; date = addDays(date, 1)) {
      for (; index < sorted.length && sorted[index].date === date; index++) {
        const e = sorted[index];
        const key = positionKey(e.target, e.platform);
        const pos = quantities.get(key) || { target: e.target, platform: e.platform, quantity: 0 };
        pos.quantity += e.quantity;
        quantities.set(key, pos);
      }
      invested -= overallFlowByDate.get(date) || 0;

      const isToday = date === today;
      let value = 0;
      quantities.forEach(pos => {
        if (Math.abs(pos.quantity) < EPSILON) return;
        const category = categorize(pos.target, pos.platform);
        if (category === PAYMENT_CATEGORY) return;
        const v = pos.quantity * priceOf(pos.target, pos.platform, date);
        value += v;
        if (isToday) categoryValues.set(category, (categoryValues.get(category) || 0) + v);
      });
      series.push({ date, value, invested });
    }
  }

  // 3. XIRR：現金流 + 今日市值視為全部取回
  const withTerminal = (list: CashFlow[], value: number) => [...list, { date: today, amount: value }];
  const firstDate = (list: CashFlow[]) => list.reduce((min, f) => (f.date < min ? f.date : min), today);
  const totalValue = series.length > 0 ? series[series.length - 1].value : 0;

  const categories: CategoryPerformance[] = CATEGORIES
    .filter(category => flows.has(category) || categoryValues.has(category))
    .map(category => {
      const list = flows.get(category) || [];
      const value = categoryValues.get(category) || 0;
      return {
        category,
        value,
        invested: -list.reduce((sum, f) => sum + f.amount, 0),
        contributed: -list.reduce((sum, f) => sum + Math.min(f.amount, 0), 0),
        xirr: xirr(withTerminal(list, value)),
        since: firstDate(list),
      };
    });

  return {
    series,
    overall: {
      value: totalValue,
      invested,
      xirr: xirr(withTerminal(overallFlows, totalValue)),
      since: firstDate(overallFlows),
    },
    categories,
    lendingUsd: lendingUsdXirr(sorted, today),
    missingPrices: Array.from(missing).sort(),
  };
}
