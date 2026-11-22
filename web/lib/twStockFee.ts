/** 台股買賣的手續費與證交稅（一般戶、固定折數） */

const FEE_RATE = 0.001425;
const LOT_SIZE = 1000;
const MIN_FEE_LOT = 20;
const MIN_FEE_ODD = 1;
const TAX_RATE_STOCK = 0.003;
const TAX_RATE_ETF = 0.001;

export const DEFAULT_FEE_DISCOUNT = 6; // 6 折

export interface TwStockCost {
  gross: number; // 成交金額
  fee: number; // 折扣後手續費
  tax: number; // 證交稅（僅賣出）
  amount: number; // 買入：實付；賣出：實收
}

/** 代號 00 開頭視為 ETF（0050、006208、00878…） */
export const isTwEtf = (target: string) => target.trim().startsWith('00');

/**
 * @param discount 折數，6 代表 6 折
 * 整股（股數為 1000 的倍數）最低手續費 20 元，零股 1 元；金額皆無條件捨去
 */
export function calcTwStockCost(
  side: 'buy' | 'sell',
  target: string,
  shares: number,
  price: number,
  discount: number
): TwStockCost {
  const gross = Math.round(shares * price);
  const minFee = shares % LOT_SIZE === 0 ? MIN_FEE_LOT : MIN_FEE_ODD;
  const fee = Math.max(Math.floor(gross * FEE_RATE * (discount / 10)), minFee);
  const tax = side === 'sell' ? Math.floor(gross * (isTwEtf(target) ? TAX_RATE_ETF : TAX_RATE_STOCK)) : 0;
  const amount = side === 'buy' ? gross + fee : gross - fee - tax;
  return { gross, fee, tax, amount };
}
