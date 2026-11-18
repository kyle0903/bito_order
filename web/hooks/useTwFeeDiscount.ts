'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_FEE_DISCOUNT } from '@/lib/twStockFee';

const STORAGE_KEY = 'tw_fee_discount';

/** 台股手續費折數（6 代表 6 折），存在 localStorage */
export function useTwFeeDiscount() {
  const [discount, setDiscount] = useState(DEFAULT_FEE_DISCOUNT);

  useEffect(() => {
    const stored = parseFloat(localStorage.getItem(STORAGE_KEY) || '');
    if (stored > 0 && stored <= 10) setDiscount(stored);
  }, []);

  const saveDiscount = useCallback((next: number) => {
    localStorage.setItem(STORAGE_KEY, String(next));
    setDiscount(next);
  }, []);

  return { discount, saveDiscount };
}
