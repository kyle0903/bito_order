'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from './Card';
import { useBitfinexCredentials } from '@/hooks/useBitfinexCredentials';
import { fetchWithBitfinexCredentials } from '@/lib/api';
import { formatPercent, isUnderOneYear } from '@/hooks/usePerformance';
import type { LendingSummary } from '@/lib/bitfinex';
import type { PerformanceResult } from '@/lib/performance';

interface LendingCardProps {
  performance: PerformanceResult | null;
  showAmounts: boolean;
}

const DAY_MS = 86400000;

const formatDate = (ms: number) => new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 10);

/** 總覽頁的 Bitfinex 放貸區塊：放貸明細、閒置資金、USD / TWD 年化 */
export default function LendingCard({ performance, showAmounts }: LendingCardProps) {
  const { credentials, isConfigured } = useBitfinexCredentials();
  const [summary, setSummary] = useState<LendingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!isConfigured) return;
    try {
      setError(null);
      const response = await fetchWithBitfinexCredentials('/api/bitfinex/summary', credentials);
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || '讀取失敗');
      setSummary(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取失敗');
    }
  }, [credentials, isConfigured]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (!isConfigured) return null;

  const usd = (n: number) => (showAmounts ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '******');
  const apr = (dailyRate: number) => `${(dailyRate * 365 * 100).toFixed(2)}%`;

  const lent = summary?.loans.reduce((sum, l) => sum + l.amount, 0) || 0;
  const offered = summary?.offers.reduce((sum, o) => sum + o.amount, 0) || 0;
  // 已借出部位的加權日利率
  const weightedRate = lent > 0 ? summary!.loans.reduce((sum, l) => sum + l.amount * l.dailyRate, 0) / lent : 0;

  const twd = performance?.categories.find(c => c.category === '放貸');
  const usdReturn = performance?.lendingUsd;

  const stats = [
    { label: '已借出', value: usd(lent) },
    { label: '掛單中', value: usd(offered) },
    { label: '閒置', value: usd(summary?.idle || 0), warn: (summary?.idle || 0) >= 1 },
    { label: '本月至今利息', value: usd(summary?.monthInterest || 0) },
    { label: '目前加權年利率', value: lent > 0 ? apr(weightedRate) : '--' },
    {
      label: 'USD 年化（放貸本身）',
      value: formatPercent(usdReturn?.xirr ?? null),
      sub: usdReturn && isUnderOneYear(usdReturn.since) ? '未滿一年' : undefined,
    },
    {
      label: 'TWD 年化（含匯差）',
      value: formatPercent(twd?.xirr ?? null),
      sub: twd && isUnderOneYear(twd.since) ? '未滿一年' : undefined,
    },
  ];

  return (
    <Card className="mt-6">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full px-6 py-4 flex items-center justify-between text-left gap-4"
      >
        <h3 className="text-base font-semibold text-neutral-100">
          放貸 <span className="text-sm font-normal text-neutral-400">（Bitfinex）</span>
        </h3>
        <div className="flex items-center gap-4 text-sm">
          {error ? (
            <span className="text-danger-400">{error}</span>
          ) : summary ? (
            <span className="text-neutral-400 tabular-nums hidden sm:inline">
              年利率 {lent > 0 ? apr(weightedRate) : '--'} · 本月利息 {usd(summary.monthInterest)}
            </span>
          ) : (
            <span className="text-neutral-500">載入中...</span>
          )}
          <span className="text-neutral-400 whitespace-nowrap">{expanded ? '收合 ▲' : '展開 ▼'}</span>
        </div>
      </button>

      {expanded && summary && (
        <div className="border-t border-neutral-800">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 px-6 py-4">
            {stats.map(s => (
              <div key={s.label}>
                <p className="text-xs text-neutral-500">{s.label}</p>
                <p className={`text-sm font-semibold tabular-nums ${s.warn ? 'text-warning-400' : 'text-neutral-100'}`}>{s.value}</p>
                {s.sub && <p className="text-xs text-neutral-500">{s.sub}</p>}
              </div>
            ))}
          </div>

          {summary.loans.length === 0 ? (
            <p className="px-6 pb-4 text-sm text-neutral-400">目前沒有借出中的資金</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-800">
                  <tr className="text-xs font-semibold text-neutral-100">
                    <th className="px-6 py-2 text-right">金額 (USD)</th>
                    <th className="px-4 py-2 text-right">年利率</th>
                    <th className="px-4 py-2 text-right">期間</th>
                    <th className="px-4 py-2 text-right">開始</th>
                    <th className="px-4 py-2 text-right">到期</th>
                    <th className="px-6 py-2 text-right">剩餘</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {summary.loans.map(loan => {
                    const daysLeft = Math.max(Math.ceil((loan.expiresAt - Date.now()) / DAY_MS), 0);
                    return (
                      <tr key={loan.id}>
                        <td className="px-6 py-2 text-right tabular-nums text-neutral-100">{usd(loan.amount)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-100">{apr(loan.dailyRate)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-300">{loan.periodDays} 天</td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-400">{formatDate(loan.openedAt)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-neutral-400">{formatDate(loan.expiresAt)}</td>
                        <td className="px-6 py-2 text-right tabular-nums text-neutral-100">{daysLeft} 天</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="px-6 py-2 text-xs text-neutral-500 border-t border-neutral-800">
            * USD 年化以帳本中 Bitfinex 的轉入 / 轉出與目前餘額計算；TWD 年化即績效頁的放貸分類，兩者差距為匯率影響
          </p>
        </div>
      )}
    </Card>
  );
}
