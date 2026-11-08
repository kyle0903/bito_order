/**
 * 投資記帳核心邏輯（純函式，前後端共用）
 *
 * Notion 每一筆紀錄 = 一個 LedgerEntry
 * - Quantity：數量（增加為正、減少為負）
 * - Amount：TWD 現金流（買入為正、含手續費；賣出為負、為扣除手續費後的實收；利息/轉帳/兌換/調整為 0）
 */

export const PLATFORMS = ['BitoPro', 'Bitfinex', 'Ether.fi', '券商'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const ENTRY_TYPES = ['買入', '賣出', '利息', '轉帳', '兌換', '調整'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

/** 需要兩筆（轉出 + 轉入）共用 GroupId 的類型 */
export const GROUPED_TYPES: EntryType[] = ['轉帳', '兌換'];

/** 投資分類（計入總資產與目標配置） */
export const CATEGORIES = ['台股', '美股', 'BTC', 'ETH', '放貸', '其他'] as const;
export type Category = (typeof CATEGORIES)[number];

/** 支付用途（如 Ether.fi 卡片）：不計入總資產與目標配置 */
export const PAYMENT_CATEGORY = '支付';
export type AssetCategory = Category | typeof PAYMENT_CATEGORY;

export interface LedgerEntryInput {
  target: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  amount: number;
  platform: Platform;
  type: EntryType;
  groupId?: string;
  orderId?: string;
}

export interface LedgerEntry extends LedgerEntryInput {
  id: string;
  createdTime: string; // ISO
}

export interface Position {
  target: string;
  platform: Platform;
  quantity: number;
  cost: number; // 剩餘持倉的成本（平均成本法）
  realized: number; // 此部位累計已實現損益
}

const EPSILON = 1e-8;

export function positionKey(target: string, platform: string): string {
  return `${target.toUpperCase()}|${platform}`;
}

/** 數量趨近 0 視為已結清 */
export function isClosed(quantity: number): boolean {
  return Math.abs(quantity) < EPSILON;
}

/** 資產分類規則（由上往下比對） */
export function categorize(target: string, platform: string): AssetCategory {
  const symbol = target.toUpperCase();
  if (platform === 'Ether.fi') return PAYMENT_CATEGORY;
  if (platform === 'Bitfinex') return '放貸';
  if (symbol.endsWith('.TW')) return '台股';
  if (platform === '券商') return '美股';
  if (symbol === 'BTC') return 'BTC';
  if (symbol === 'ETH') return 'ETH';
  return '其他';
}

// Notion 建立時間只精確到分鐘；同日同分鐘時依操作的自然順序排
const TYPE_ORDER: Record<EntryType, number> = { 買入: 0, 利息: 1, 轉帳: 2, 兌換: 3, 調整: 4, 賣出: 5 };

function compareEntries(a: LedgerEntry, b: LedgerEntry): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.createdTime !== b.createdTime) return a.createdTime < b.createdTime ? -1 : 1;
  return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
}

/**
 * 依時間順序逐筆計算每個「代號 + 平台」的持倉與已實現損益（平均成本法）
 * - 賣出：按平均成本扣成本，差額計入已實現損益
 * - 利息：數量增加，成本不變
 * - 轉帳/兌換：轉出端依平均成本移出成本，轉入端承接該成本，不產生損益
 */
export function computePositions(entries: LedgerEntry[]): Position[] {
  const positions = new Map<string, Position>();
  const getPosition = (target: string, platform: Platform): Position => {
    const key = positionKey(target, platform);
    let pos = positions.get(key);
    if (!pos) {
      pos = { target: target.toUpperCase(), platform, quantity: 0, cost: 0, realized: 0 };
      positions.set(key, pos);
    }
    return pos;
  };

  // 從部位移出數量，回傳移出的成本
  const removeQuantity = (pos: Position, qty: number): number => {
    if (pos.quantity <= EPSILON) {
      pos.quantity -= qty;
      return 0;
    }
    const ratio = Math.min(qty / pos.quantity, 1);
    const costOut = pos.cost * ratio;
    pos.quantity -= qty;
    pos.cost -= costOut;
    return costOut;
  };

  const settle = (pos: Position) => {
    if (isClosed(pos.quantity)) {
      pos.quantity = 0;
      pos.cost = 0;
    }
  };

  // 轉帳/兌換的兩筆要一起處理（先轉出、再轉入）
  const sorted = [...entries].sort(compareEntries);
  const handledGroups = new Set<string>();

  for (const entry of sorted) {
    if (GROUPED_TYPES.includes(entry.type) && entry.groupId) {
      if (handledGroups.has(entry.groupId)) continue;
      handledGroups.add(entry.groupId);

      const legs = sorted.filter(e => e.groupId === entry.groupId);
      const outs = legs.filter(e => e.quantity < 0);
      const ins = legs.filter(e => e.quantity > 0);

      let carriedCost = 0;
      for (const out of outs) {
        const pos = getPosition(out.target, out.platform);
        carriedCost += removeQuantity(pos, -out.quantity);
        settle(pos);
      }
      const totalIn = ins.reduce((sum, e) => sum + e.quantity, 0);
      for (const inLeg of ins) {
        const pos = getPosition(inLeg.target, inLeg.platform);
        pos.quantity += inLeg.quantity;
        pos.cost += totalIn > 0 ? carriedCost * (inLeg.quantity / totalIn) : 0;
        settle(pos);
      }
      continue;
    }

    const pos = getPosition(entry.target, entry.platform);
    if (entry.type === '調整') {
      // 調整：修正數量（如提領、Gas 損耗），成本不變；若因此結清，剩餘成本計入已實現損益
      pos.quantity += entry.quantity;
      if (isClosed(pos.quantity)) pos.realized -= pos.cost;
    } else if (entry.quantity >= 0) {
      // 買入 / 利息（利息 amount 為 0，成本不變）
      pos.quantity += entry.quantity;
      pos.cost += entry.amount;
    } else {
      // 賣出：-amount 為實收金額
      const costOut = removeQuantity(pos, -entry.quantity);
      pos.realized += -entry.amount - costOut;
    }
    settle(pos);
  }

  return Array.from(positions.values());
}
