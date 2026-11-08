'use client';

import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES, Category } from '@/lib/ledger';

const STORAGE_KEY = 'allocation_targets';

export type AllocationTargets = Record<Category, number>;

export const DEFAULT_ALLOCATION_TARGETS: AllocationTargets = {
  台股: 0,
  美股: 0,
  BTC: 40,
  ETH: 10,
  放貸: 50,
  其他: 0,
};

/** 偏離目標在此百分點以內視為正常 */
export const ALLOCATION_TOLERANCE = 5;

export function sumTargets(targets: AllocationTargets): number {
  return CATEGORIES.reduce((sum, c) => sum + (targets[c] || 0), 0);
}

/**
 * Hook 用於管理 localStorage 中的目標配置（百分比，加總須為 100）
 */
export function useAllocationTargets() {
  const [targets, setTargets] = useState<AllocationTargets>(DEFAULT_ALLOCATION_TARGETS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTargets({ ...DEFAULT_ALLOCATION_TARGETS, ...JSON.parse(stored) });
      }
    } catch (err) {
      console.error('Failed to load allocation targets:', err);
    }
  }, []);

  const saveTargets = useCallback((next: AllocationTargets) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTargets(next);
  }, []);

  return { targets, saveTargets };
}
