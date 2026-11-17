'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import PerformanceChart from '@/components/PerformanceChart';
import { CATEGORY_COLORS } from '@/components/AssetPieChart';
import { usePerformance, isUnderOneYear, formatPercent } from '@/hooks/usePerformance';

const pnlColor = (n: number | null) => (n === null ? 'text-neutral-400' : n >= 0 ? 'text-success-400' : 'text-danger-400');

export default function PerformancePage() {
  const { data, loading, error, isConfigured, isCredLoading, refresh } = usePerformance();
  const [showAmounts, setShowAmounts] = useState(false);

  // 沿用總覽頁的金額顯示設定
  useEffect(() => {
    setShowAmounts(localStorage.getItem('showAssetAmounts') === 'true');
  }, []);

  const money = (n: number, signed = false) =>
    showAmounts ? `${signed && n >= 0 ? '+' : ''}NT$ ${Math.round(n).toLocaleString('en-US')}` : '******';

  if (!isCredLoading && !isConfigured) {
    return (
      <DashboardLayout title="績效">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-neutral-400">尚未設定 Notion 連線</p>
            <Link href="/settings" className="mt-2 inline-block text-sm text-primary-400 hover:underline">前往設定</Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const overall = data?.overall;
  const profit = overall ? overall.value - overall.invested : 0;
  const profitRate = overall && overall.invested > 0 ? profit / overall.invested : null;

  const kpis = [
    { label: '目前淨值', value: overall ? money(overall.value) : '...', color: 'text-primary-300' },
    { label: '累計淨投入', value: overall ? money(overall.invested) : '...', color: 'text-neutral-100' },
    {
      label: '總損益',
      value: overall ? money(profit, true) : '...',
      color: pnlColor(overall ? profit : null),
      sub: profitRate !== null ? formatPercent(profitRate) : undefined,
    },
    {
      label: '年化報酬 (XIRR)',
      value: overall ? formatPercent(overall.xirr) : '...',
      color: pnlColor(overall?.xirr ?? null),
      sub: overall ? `自 ${overall.since}${isUnderOneYear(overall.since) ? '（未滿一年，僅供參考）' : ''}` : undefined,
    },
  ];

  return (
    <DashboardLayout title="績效">
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-danger-900/30 text-sm text-danger-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={refresh} className="text-primary-400 hover:underline">重試</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="py-5">
              <p className="text-sm font-medium text-neutral-400 mb-1">{kpi.label}</p>
              <p className={`text-3xl font-bold tabular-nums ${loading ? 'text-neutral-100' : kpi.color}`}>{loading ? '...' : kpi.value}</p>
              {!loading && kpi.sub && <p className="text-xs text-neutral-400 mt-1">{kpi.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-100">淨值 vs 累計淨投入</h3>
          <button onClick={refresh} disabled={loading} className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-50">
            {loading ? '計算中...' : '重新整理'}
          </button>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-full text-sm text-neutral-400">計算中...</div>
            ) : (
              <PerformanceChart data={data?.series || []} showAmounts={showAmounts} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-neutral-100">各分類績效</h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-800">
                <tr className="text-xs font-semibold text-neutral-100">
                  <th className="px-4 py-3 text-left">分類</th>
                  <th className="px-4 py-3 text-right">現值</th>
                  <th className="px-4 py-3 text-right">淨投入</th>
                  <th className="px-4 py-3 text-right">損益</th>
                  <th className="px-4 py-3 text-right">年化 (XIRR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {(data?.categories || []).map(row => {
                  const rowProfit = row.value - row.invested;
                  return (
                    <tr key={row.category}>
                      <td className="px-4 py-3 font-medium text-neutral-100 whitespace-nowrap">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: CATEGORY_COLORS[row.category] }} />
                        {row.category}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-100">{money(row.value)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-300">{money(row.invested)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${pnlColor(rowProfit)}`}>{money(rowProfit, true)}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        <span className={pnlColor(row.xirr)}>{formatPercent(row.xirr)}</span>
                        {isUnderOneYear(row.since) && <span className="ml-1 text-xs text-neutral-500">未滿一年</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-neutral-500 border-t border-neutral-800 space-y-1">
            <p>* 依帳本與每日收盤價（Yahoo Finance）重建，與總覽頁的即時價格可能略有差異；不含支付分類（轉去 Ether.fi 視為提領）</p>
            <p>* 跨分類的轉帳 / 兌換以當日市值計為來源分類的取回、目的分類的投入</p>
            {data && data.missingPrices.length > 0 && (
              <p className="text-warning-400">* 部分期間查無歷史價格，該期間以 0 計價：{data.missingPrices.join('、')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
