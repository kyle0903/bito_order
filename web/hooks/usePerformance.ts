'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNotionCredentials } from './useNotionCredentials';
import { fetchWithNotionCredentials } from '@/lib/api';
import type { PerformanceResult } from '@/lib/performance';

/** 取得帳本重建的淨值走勢與 XIRR（/api/performance） */
export function usePerformance() {
  const { credentials, isConfigured, isLoading: isCredLoading } = useNotionCredentials();
  const [data, setData] = useState<PerformanceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithNotionCredentials('/api/performance', credentials);
      const json = await response.json();
      if (!response.ok) throw new Error(json.details || json.error || '讀取失敗');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [credentials, isConfigured]);

  useEffect(() => {
    if (!isCredLoading) refresh();
  }, [isCredLoading, refresh]);

  return { data, loading, error, isConfigured, isCredLoading, refresh };
}

/** 持有未滿一年時，年化報酬僅供參考 */
export function isUnderOneYear(since: string): boolean {
  return Date.now() - Date.parse(since) < 365 * 86400000;
}

export function formatPercent(rate: number | null): string {
  if (rate === null) return '--';
  const pct = rate * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}
