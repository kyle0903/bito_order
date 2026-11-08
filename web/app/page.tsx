'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import AssetPieChart, { CATEGORY_COLORS } from '@/components/AssetPieChart';
import { AssetIcon, PlatformBadge } from '@/components/AssetBadges';
import { useNotionCredentials } from '@/hooks/useNotionCredentials';
import { fetchWithNotionCredentials } from '@/lib/api';
import { Position, AssetCategory, CATEGORIES, PAYMENT_CATEGORY, categorize, isClosed, positionKey } from '@/lib/ledger';
import { useAllocationTargets, ALLOCATION_TOLERANCE } from '@/hooks/useAllocationTargets';
import Link from 'next/link';

// 顯示用資料介面
interface AssetDisplay {
  key: string;           // 代號 + 平台
  symbol: string;
  name: string;
  platform: string;
  category: AssetCategory;
  quantity: number;      // 持有數量
  totalAmount: number;   // 剩餘持倉成本（平均成本法）
  realized: number;      // 已實現損益
  price: number;         // 從 BitoPro 取得的台幣價格
  priceChange24hr: number;
  valueTWD: number;      // 當前市值 (quantity * price)
  hasTWDPair: boolean;   // 是否有台幣交易對
  quoteCurrency?: string;
}

interface ExchangeRates {
  USD: number;
}

interface FearGreedData {
  value: number;
  classification: string;
  classificationEn: string;
  color: string;
}

export default function Home() {
  const { credentials: notionCredentials, isConfigured: isNotionConfigured, isLoading: isNotionLoading } = useNotionCredentials();
  const { targets: allocationTargets } = useAllocationTargets();
  const [assets, setAssets] = useState<AssetDisplay[]>([]);
  const [closedAssets, setClosedAssets] = useState<AssetDisplay[]>([]);
  const [paymentAssets, setPaymentAssets] = useState<AssetDisplay[]>([]); // 支付用途（不計入總資產）
  const [showClosed, setShowClosed] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notionNotConfigured, setNotionNotConfigured] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [showAmounts, setShowAmounts] = useState(false);

  // 從 localStorage 讀取顯示狀態
  useEffect(() => {
    const saved = localStorage.getItem('showAssetAmounts');
    if (saved !== null) {
      setShowAmounts(saved === 'true');
    }
  }, []);

  // 切換顯示狀態
  const toggleShowAmounts = () => {
    const newValue = !showAmounts;
    setShowAmounts(newValue);
    localStorage.setItem('showAssetAmounts', String(newValue));
  };

  const sanitizeDisplayNumber = (value: number, maximumFractionDigits = 8): number => {
    const precisionThreshold = 0.5 * Math.pow(10, -maximumFractionDigits);
    if (Math.abs(value) < precisionThreshold || Object.is(value, -0)) {
      return 0;
    }
    return value;
  };

  const hasQuantity = (quantity: number): boolean => {
    return sanitizeDisplayNumber(quantity, 8) !== 0;
  };

  // 格式化顯示金額（根據 showAmounts 狀態）
  const formatAmount = (amount: number, options?: Intl.NumberFormatOptions) => {
    if (!showAmounts) return '******';
    const maxFractionDigits = options?.maximumFractionDigits ?? 8;
    const displayAmount = sanitizeDisplayNumber(amount, maxFractionDigits);
    return displayAmount.toLocaleString('en-US', options);
  };

  // 獲取單一交易對的價格和24小時變化
  const fetchTickerData = async (symbol: string): Promise<{ price: number; priceChange24hr: number; hasTWDPair: boolean; quoteCurrency?: string }> => {
    // TWD 本身價值為 1，無變化
    if (symbol === 'TWD') return { price: 1, priceChange24hr: 0, hasTWDPair: true, quoteCurrency: 'TWD' };

    // USD（如 Bitfinex 放貸）以 USD/TWD 匯率計價
    if (symbol === 'USD') {
      try {
        const response = await fetch('/api/finance/fx');
        if (response.ok) {
          const data = await response.json();
          const rate = data.data?.rate || 0;
          if (rate > 0) return { price: rate, priceChange24hr: 0, hasTWDPair: true, quoteCurrency: 'USD' };
        }
      } catch {
        // 匯率取得失敗
      }
      return { price: 0, priceChange24hr: 0, hasTWDPair: false };
    }

    // 1. 先嘗試從 BitoPro 取得加密貨幣價格
    try {
      const pair = `${symbol.toLowerCase()}_twd`;
      const response = await fetch(`/api/bitopro/ticker/${pair}`);

      if (response.ok) {
        const data = await response.json();
        const price = parseFloat(data.data?.lastPrice) || 0;

        if (price > 0) {
          return {
            price,
            priceChange24hr: parseFloat(data.data?.priceChange24hr) || 0,
            hasTWDPair: true,
            quoteCurrency: 'TWD',
          };
        }
      }
    } catch {
      // BitoPro 失敗，繼續嘗試 Yahoo Finance
    }

    // 2. 如果 BitoPro 沒有，嘗試從 Yahoo Finance 取得股票價格
    try {
      const response = await fetch(`/api/finance/stock/${symbol.toUpperCase()}`);

      if (response.ok) {
        const data = await response.json();
        const twdPrice = data.data?.priceTWD || 0;
        const priceChangePercent = data.data?.priceChangePercent || 0;
        const quoteCurrency = (data.data?.currency || '').toUpperCase();

        if (twdPrice > 0) {
          return {
            price: twdPrice,
            priceChange24hr: priceChangePercent,
            hasTWDPair: true,
            quoteCurrency,
          };
        }
      }
    } catch {
      // Yahoo Finance 也失敗
    }

    // 3. 兩個來源都找不到，返回錯誤狀態
    return { price: 0, priceChange24hr: 0, hasTWDPair: false };
  };

  // 獲取資產資料
  const fetchAssets = useCallback(async () => {
    // 如果 Notion 未設定，不繼續取得資料
    if (!isNotionConfigured) {
      setNotionNotConfigured(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNotionNotConfigured(false);

      // 從 Notion 取得資產資料，帶上憑證
      const response = await fetchWithNotionCredentials('/api/notion/assets', notionCredentials);

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.notConfigured) {
          setNotionNotConfigured(true);
          setLoading(false);
          return;
        }
        throw new Error(errorData.error || 'Failed to fetch assets from Notion');
      }

      const data = await response.json();
      const positions: Position[] = data.data || [];
      const openPositions = positions.filter(p => !isClosed(p.quantity));

      // 已結清部位：只列出有已實現損益的（轉帳轉空的部位不列）
      const closed: AssetDisplay[] = positions
        .filter(p => isClosed(p.quantity) && Math.abs(p.realized) >= 1)
        .map(p => ({
          key: positionKey(p.target, p.platform),
          symbol: p.target,
          name: p.target,
          platform: p.platform,
          category: categorize(p.target, p.platform),
          quantity: 0,
          totalAmount: 0,
          realized: p.realized,
          price: 0,
          priceChange24hr: 0,
          valueTWD: 0,
          hasTWDPair: true,
        }))
        .sort((a, b) => a.realized - b.realized);

      // 同一代號在多個平台只查一次價格
      const symbols = Array.from(new Set(openPositions.map(p => p.target.toUpperCase())));
      const tickers = new Map(
        await Promise.all(symbols.map(async s => [s, await fetchTickerData(s)] as const))
      );

      const assetsWithPrices: AssetDisplay[] = openPositions.map(p => {
        const symbol = p.target.toUpperCase();
        const { price, priceChange24hr, hasTWDPair, quoteCurrency } = tickers.get(symbol)!;
        return {
          key: positionKey(symbol, p.platform),
          symbol,
          name: symbol,
          platform: p.platform,
          category: categorize(symbol, p.platform),
          quantity: p.quantity,
          totalAmount: p.cost,
          realized: p.realized,
          price,
          priceChange24hr,
          valueTWD: hasTWDPair ? p.quantity * price : 0,
          hasTWDPair,
          quoteCurrency,
        };
      });

      // 按市值排序，有價格的在前面
      assetsWithPrices.sort((a, b) => {
        if (a.hasTWDPair && !b.hasTWDPair) return -1;
        if (!a.hasTWDPair && b.hasTWDPair) return 1;
        return b.valueTWD - a.valueTWD;
      });

      // 支付用途的資產另外顯示，不計入總資產、損益與配置
      setAssets(assetsWithPrices.filter(a => a.category !== PAYMENT_CATEGORY));
      setPaymentAssets(assetsWithPrices.filter(a => a.category === PAYMENT_CATEGORY));
      setClosedAssets(closed.filter(a => a.category !== PAYMENT_CATEGORY));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  }, [isNotionConfigured, notionCredentials]);

  // 獨立取得匯率和恐懼貪婪指數（不依賴 Notion）
  useEffect(() => {
    // 從 Yahoo Finance 取得 USD/TWD 匯率
    const fetchExchangeRate = async () => {
      try {
        const fxResponse = await fetch('/api/finance/fx');
        if (fxResponse.ok) {
          const fxData = await fxResponse.json();
          const usdRate = fxData.data?.rate || 32;
          setExchangeRates({ USD: usdRate });
        } else {
          setExchangeRates({ USD: 32 }); // 預設匯率
        }
      } catch {
        setExchangeRates({ USD: 32 }); // 預設匯率
      }
    };

    // 取得恐懼貪婪指數
    const fetchFearGreed = async () => {
      try {
        const fgResponse = await fetch('/api/feargreed');
        if (fgResponse.ok) {
          const fgData = await fgResponse.json();
          if (fgData.success) {
            setFearGreed(fgData.data);
          }
        }
      } catch {
        // 失敗時不顯示指數
      }
    };

    fetchExchangeRate();
    fetchFearGreed();
  }, []);

  // 當 Notion 設定改變時重新取得資料
  useEffect(() => {
    if (!isNotionLoading) {
      fetchAssets();
    }
  }, [isNotionLoading, fetchAssets]);

  // 計算有價格的資產總價值 (TWD)
  const totalValueTWD = assets
    .filter(asset => asset.hasTWDPair)
    .reduce((sum, asset) => sum + asset.valueTWD, 0);

  // 計算總成本
  const totalCost = assets
    .filter(asset => asset.hasTWDPair)
    .reduce((sum, asset) => sum + asset.totalAmount, 0);

  // 計算未實現損益（目前持有）和損益率
  const totalProfitLoss = totalValueTWD - totalCost;
  const totalProfitLossRate = totalCost > 0
    ? ((totalValueTWD - totalCost) / totalCost) * 100
    : 0;

  // 已實現損益（含已結清部位與持有中部位的部分賣出）
  const totalRealized = [...assets, ...closedAssets].reduce((sum, asset) => sum + asset.realized, 0);

  // 目標配置 vs 目前配置
  const allocationRows = CATEGORIES.map(category => {
    const value = assets
      .filter(asset => asset.hasTWDPair && asset.category === category)
      .reduce((sum, asset) => sum + asset.valueTWD, 0);
    const currentPct = totalValueTWD > 0 ? (value / totalValueTWD) * 100 : 0;
    const targetPct = allocationTargets[category] || 0;
    return {
      category,
      value,
      currentPct,
      targetPct,
      deviation: currentPct - targetPct,
      rebalanceTWD: (targetPct / 100) * totalValueTWD - value, // 正數＝需買入，負數＝需賣出
    };
  }).filter(row => row.value > 0 || row.targetPct > 0);

  // 計算總資產價值 (USD)
  const totalValueUSD = exchangeRates?.USD && exchangeRates.USD > 0
    ? totalValueTWD / exchangeRates.USD
    : 0;

  // 計算總資產的24小時加權平均變化百分比
  const totalChange24hr = totalValueTWD > 0
    ? assets
      .filter(asset => asset.hasTWDPair)
      .reduce((weightedSum, asset) => {
        const weight = asset.valueTWD / totalValueTWD;
        return weightedSum + (asset.priceChange24hr * weight);
      }, 0)
    : 0;

  // 計算單一資產的損益率
  const getProfitLossRate = (asset: AssetDisplay): number => {
    if (!asset.hasTWDPair || asset.totalAmount === 0) return 0;
    return ((asset.valueTWD - asset.totalAmount) / asset.totalAmount) * 100;
  };

  // 統計有/無價格的資產數量
  const assetsWithoutPrice = assets.filter(a => !a.hasTWDPair);
  const shouldShowUsdForAsset = (asset: AssetDisplay): boolean => {
    // .TW 結尾的台股不顯示 USD，其他資產（加密貨幣、美股等）都顯示 USD
    return !asset.symbol.toUpperCase().endsWith('.TW');
  };


  return (
    <DashboardLayout title="資產總覽">
      {/* Notion 未設定警告 */}
      {notionNotConfigured && (
        <div className="mb-6 p-4 rounded-lg bg-warning-900/30 border border-warning-700/50">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-warning-400 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-warning-300">尚未設定 Notion 連線</p>
              <p className="text-xs text-warning-400/80 mt-0.5">請先設定 Notion API Token 和 Database ID 以載入您的資產資料</p>
            </div>
            <Link
              href="/settings"
              className="px-3 py-1.5 text-sm font-medium text-warning-300 bg-warning-900/50 hover:bg-warning-900 rounded-md transition-colors"
            >
              前往設定
            </Link>
          </div>
        </div>
      )}

      {/* 總覽統計 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-neutral-400">總資產價值</p>
                <button
                  onClick={toggleShowAmounts}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 rounded-full hover:bg-neutral-800"
                  title={showAmounts ? '隱藏金額' : '顯示金額'}
                >
                  {showAmounts ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.964-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              </div>
              {!loading && totalChange24hr !== 0 && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${totalChange24hr > 0
                  ? 'bg-success-900/30 text-success-400'
                  : 'bg-danger-900/30 text-danger-400'
                  }`}>
                  {totalChange24hr > 0 ? '+' : ''}{totalChange24hr.toFixed(2)}% (24h)
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-primary-300 tabular-nums">
              {loading ? '...' : `NT$ ${formatAmount(totalValueTWD, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </p>
            {!loading && exchangeRates?.USD && exchangeRates.USD > 0 && (
              <p className="text-sm text-neutral-400 tabular-nums mt-1">
                ≈ ${formatAmount(totalValueUSD, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USD
              </p>
            )}
          </CardContent>
        </Card>

        {/* 總損益卡片 */}
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-neutral-400">未實現損益</p>
              {!loading && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${totalProfitLossRate >= 0
                  ? 'bg-success-900/30 text-success-400'
                  : 'bg-danger-900/30 text-danger-400'
                  }`}>
                  {totalProfitLossRate >= 0 ? '+' : ''}{totalProfitLossRate.toFixed(2)}%
                </span>
              )}
            </div>
            {loading ? (
              <p className="text-3xl font-bold text-neutral-100">...</p>
            ) : (
              <>
                <p className={`text-3xl font-bold tabular-nums ${totalProfitLoss >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                  {totalProfitLoss >= 0 ? '+' : ''}NT$ {formatAmount(totalProfitLoss, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  持倉成本: NT$ {formatAmount(totalCost, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  已實現損益:{' '}
                  <span className={`tabular-nums ${totalRealized >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                    {totalRealized >= 0 ? '+' : ''}NT$ {formatAmount(totalRealized, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-neutral-400 mb-1">匯率</p>
            {!exchangeRates ? (
              <p className="text-lg font-semibold text-neutral-100">Loading...</p>
            ) : exchangeRates.USD > 0 ? (
              <div className="space-y-1">
                <p className="text-3xl font-bold text-primary-300 tabular-nums">NT$ {exchangeRates.USD}</p>
                <p className="tabular-nums text-xs text-neutral-400">1 USD/TWD</p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-danger-400">Failed</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-neutral-400 mb-1">恐懼貪婪指數</p>
            {!fearGreed ? (
              <p className="text-lg font-semibold text-neutral-100">Loading...</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-3xl font-bold tabular-nums"
                    style={{ color: fearGreed.color }}
                  >
                    {fearGreed.value}
                  </span>
                  <span
                    className="text-sm font-semibold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${fearGreed.color}20`,
                      color: fearGreed.color
                    }}
                  >
                    {fearGreed.classification}
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${fearGreed.value}%`,
                      backgroundColor: fearGreed.color
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 資產配置圓餅圖（現值） */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-neutral-100">資產配置</h3>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-neutral-400">載入中...</p>
              </div>
            ) : (
              <AssetPieChart
                data={allocationRows}
                showAmounts={showAmounts}
              />
            )}
          </CardContent>
        </Card>

        {/* 目標配置 vs 目前配置 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-100">目標配置</h3>
            <Link href="/settings" className="text-sm text-primary-400 hover:text-primary-300">調整目標</Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-neutral-400">載入中...</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-neutral-800">
                  <tr className="text-xs font-semibold text-neutral-100">
                    <th className="px-4 py-2 text-left">分類</th>
                    <th className="px-2 py-2 text-right">目標</th>
                    <th className="px-2 py-2 text-right">目前</th>
                    <th className="px-2 py-2 text-right">偏離</th>
                    <th className="px-4 py-2 text-right">調整至目標</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {allocationRows.map(row => {
                    const withinTolerance = Math.abs(row.deviation) <= ALLOCATION_TOLERANCE;
                    return (
                      <tr key={row.category}>
                        <td className="px-4 py-3 font-medium text-neutral-100">
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: CATEGORY_COLORS[row.category] }} />
                          {row.category}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums text-neutral-300">{row.targetPct.toFixed(0)}%</td>
                        <td className="px-2 py-3 text-right tabular-nums text-neutral-100">{row.currentPct.toFixed(1)}%</td>
                        <td className={`px-2 py-3 text-right tabular-nums font-medium ${withinTolerance ? 'text-neutral-400' : 'text-warning-400'}`}>
                          {row.deviation >= 0 ? '+' : ''}{row.deviation.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {withinTolerance ? (
                            <span className="text-neutral-500">正常</span>
                          ) : (
                            <span className={row.rebalanceTWD > 0 ? 'text-success-400' : 'text-danger-400'}>
                              {row.rebalanceTWD > 0 ? '買入' : '賣出'} NT$ {formatAmount(Math.abs(row.rebalanceTWD), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <p className="px-4 py-2 text-xs text-neutral-500 border-t border-neutral-800">
              * 偏離 ±{ALLOCATION_TOLERANCE}% 以內視為正常
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 資產列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-100">資產列表</h3>
          <button
            onClick={fetchAssets}
            disabled={loading}
            className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-50"
          >
            {loading ? '載入中...' : '重新整理'}
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-danger-400">{error}</p>
              <button
                onClick={fetchAssets}
                className="mt-2 text-sm text-primary-400 hover:underline"
              >
                重試
              </button>
            </div>
          ) : loading ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">載入資產中...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">未找到資產</p>
              <p className="mt-1 text-xs text-neutral-500">請確認 Notion 環境變數已正確設定</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* 表頭 - 僅桌面版顯示 */}
              <div className="hidden md:flex px-6 py-3 items-center justify-between bg-neutral-800">
                <span className="text-xs font-semibold text-neutral-100 uppercase tracking-wide">資產</span>
                <div className="flex items-center gap-6">
                  <span className="text-xs font-semibold text-neutral-100 uppercase tracking-wide text-right w-24">數量</span>
                  <span className="text-xs font-semibold text-neutral-100 uppercase tracking-wide text-right w-28">成本</span>
                  <span className="text-xs font-semibold text-neutral-100 uppercase tracking-wide text-right min-w-[120px]">現值 (TWD)</span>
                  <span className="text-xs font-semibold text-neutral-100 uppercase tracking-wide text-right w-24">損益率</span>
                </div>
              </div>
              {/* 資產列表 */}
              <div className="divide-y divide-neutral-800">
                {assets.map((asset) => (
                  <div
                    key={asset.key}
                    className="px-4 md:px-6 py-4 hover:bg-neutral-800/50 transition-colors"
                  >
                    {/* 手機版佈局 */}
                    <div className="md:hidden">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <AssetIcon symbol={asset.symbol} platform={asset.platform} dimmed={!asset.hasTWDPair} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-neutral-100">{asset.symbol}</p>
                              <PlatformBadge platform={asset.platform} />
                              {asset.hasTWDPair && asset.priceChange24hr !== 0 && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${asset.priceChange24hr > 0 ? 'bg-success-900/30 text-success-400' : 'bg-danger-900/30 text-danger-400'}`}>
                                  {asset.priceChange24hr > 0 ? '+' : ''}{asset.priceChange24hr.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* 損益率 */}
                        {asset.hasTWDPair && asset.totalAmount > 0 && hasQuantity(asset.quantity) && (
                          <span className={`text-sm font-semibold ${getProfitLossRate(asset) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                            {getProfitLossRate(asset) >= 0 ? '+' : ''}{getProfitLossRate(asset).toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-neutral-500">數量</p>
                          <p className="font-medium tabular-nums text-neutral-200">{formatAmount(asset.quantity, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">成本</p>
                          <p className="font-medium tabular-nums text-neutral-200">NT$ {formatAmount(asset.totalAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">現值</p>
                          <p className="font-medium tabular-nums text-neutral-200">
                            {asset.hasTWDPair ? `NT$ ${formatAmount(asset.valueTWD, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '--'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 桌面版佈局 */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <AssetIcon symbol={asset.symbol} platform={asset.platform} dimmed={!asset.hasTWDPair} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-neutral-100">{asset.symbol}</p>
                              <PlatformBadge platform={asset.platform} />
                            {asset.hasTWDPair && asset.priceChange24hr !== 0 && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${asset.priceChange24hr > 0 ? 'bg-success-900/30 text-success-400' : 'bg-danger-900/30 text-danger-400'}`}>
                                {asset.priceChange24hr > 0 ? '+' : ''}{asset.priceChange24hr.toFixed(2)}%
                              </span>
                            )}
                            {!asset.hasTWDPair && (
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500">無價格</span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400">
                            {asset.hasTWDPair ? (
                              <>
                                <p>NT$ {asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                {exchangeRates?.USD && exchangeRates.USD > 0 && shouldShowUsdForAsset(asset) && (
                                  <p>≈ ${(asset.price / exchangeRates.USD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</p>
                                )}
                              </>
                            ) : (
                              <span className="text-neutral-500">無法取得 TWD 交易對</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right w-24">
                          <p className="text-sm font-medium text-neutral-200 tabular-nums">
                            {formatAmount(asset.quantity, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                          </p>
                        </div>
                        <div className="text-right w-28">
                          <p className="text-sm font-medium text-neutral-300 tabular-nums">
                            NT$ {formatAmount(asset.totalAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="text-right min-w-[120px]">
                          {asset.hasTWDPair ? (
                            <>
                              <p className="text-sm font-semibold text-neutral-100 tabular-nums">
                                NT$ {formatAmount(asset.valueTWD, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              {exchangeRates?.USD && exchangeRates.USD > 0 && shouldShowUsdForAsset(asset) && (
                                <p className="text-xs text-neutral-400 tabular-nums">
                                  ≈ ${formatAmount(asset.valueTWD / exchangeRates.USD, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm font-medium text-neutral-500 tabular-nums">--</p>
                          )}
                        </div>
                        <div className="text-right w-24">
                          {asset.hasTWDPair && asset.totalAmount > 0 && hasQuantity(asset.quantity) ? (
                            <>
                              <p className={`text-sm font-semibold tabular-nums ${getProfitLossRate(asset) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                                {getProfitLossRate(asset) >= 0 ? '+' : ''}{getProfitLossRate(asset).toFixed(2)}%
                              </p>
                              <p className={`text-xs tabular-nums ${(asset.valueTWD - asset.totalAmount) >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
                                {(asset.valueTWD - asset.totalAmount) >= 0 ? '+' : ''}NT$ {formatAmount(asset.valueTWD - asset.totalAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-medium text-neutral-500 tabular-nums">--</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 無價格資產提示 */}
              {assetsWithoutPrice.length > 0 && (
                <div className="px-4 md:px-6 py-3 bg-neutral-800/50 border-t border-neutral-800">
                  <p className="text-xs text-neutral-500">
                    * {assetsWithoutPrice.length} 項資產無法取得台幣價格（可能為美股或其他不支援的資產）
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 支付用途（如 Ether.fi 卡片），不計入總資產與配置 */}
      {!loading && paymentAssets.length > 0 && (
        <Card className="mt-6">
          <button
            onClick={() => setShowPayment(prev => !prev)}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <h3 className="text-base font-semibold text-neutral-100">
              支付 <span className="text-sm font-normal text-neutral-400">（不計入總資產與配置）</span>
            </h3>
            <span className="text-sm text-neutral-400">{showPayment ? '收合 ▲' : '展開 ▼'}</span>
          </button>
          {showPayment && (
          <div className="divide-y divide-neutral-800 border-t border-neutral-800">
            {paymentAssets.map(asset => (
              <div key={asset.key} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AssetIcon symbol={asset.symbol} platform={asset.platform} dimmed={!asset.hasTWDPair} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-100">{asset.symbol}</p>
                      <PlatformBadge platform={asset.platform} />
                    </div>
                    <p className="text-xs text-neutral-400 tabular-nums">
                      {formatAmount(asset.quantity, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-neutral-100 tabular-nums">
                  {asset.hasTWDPair ? `NT$ ${formatAmount(asset.valueTWD, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '--'}
                </p>
              </div>
            ))}
          </div>
          )}
        </Card>
      )}

      {/* 已結清部位的已實現損益 */}
      {!loading && closedAssets.length > 0 && (
        <Card className="mt-6">
          <button
            onClick={() => setShowClosed(prev => !prev)}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <h3 className="text-base font-semibold text-neutral-100">
              已結清部位 <span className="text-sm font-normal text-neutral-400">（{closedAssets.length}）</span>
            </h3>
            <span className="text-sm text-neutral-400">{showClosed ? '收合 ▲' : '展開 ▼'}</span>
          </button>
          {showClosed && (
            <div className="divide-y divide-neutral-800 border-t border-neutral-800">
              {closedAssets.map(asset => (
                <div key={asset.key} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-100">{asset.symbol}</p>
                    <PlatformBadge platform={asset.platform} />
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${asset.realized >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                    {asset.realized >= 0 ? '+' : ''}NT$ {formatAmount(asset.realized, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}


