'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import AssetPieChart from '@/components/AssetPieChart';

// Notion 資料介面
interface NotionAsset {
  target: string;
  totalQuantity: number;
  totalAmount: number;
}

// 顯示用資料介面
interface AssetDisplay {
  symbol: string;
  name: string;
  quantity: number;      // 從 Notion 讀取的總數量
  totalAmount: number;   // 從 Notion 讀取的總金額
  price: number;         // 從 BitoPro 取得的台幣價格
  priceChange24hr: number;
  valueTWD: number;      // 當前市值 (quantity * price)
  hasTWDPair: boolean;   // 是否有台幣交易對
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
  const [assets, setAssets] = useState<AssetDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [showAmounts, setShowAmounts] = useState(true);
  const [chartMode, setChartMode] = useState<'value' | 'cost'>('value');

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

  // 格式化顯示金額（根據 showAmounts 狀態）
  const formatAmount = (amount: number, options?: Intl.NumberFormatOptions) => {
    if (!showAmounts) return '******';
    return amount.toLocaleString('en-US', options);
  };

  // 股票列表（需要從 Yahoo Finance 取得價格）
  const STOCK_SYMBOLS = ['CRCL'];

  // 獲取單一交易對的價格和24小時變化
  const fetchTickerData = async (symbol: string): Promise<{ price: number; priceChange24hr: number; hasTWDPair: boolean }> => {
    // TWD 本身價值為 1，無變化
    if (symbol === 'TWD') return { price: 1, priceChange24hr: 0, hasTWDPair: true };

    // 如果是股票，從 Yahoo Finance 取得價格
    if (STOCK_SYMBOLS.includes(symbol.toUpperCase())) {
      try {
        const response = await fetch(`/api/yahoo/${symbol.toUpperCase()}`);
        if (!response.ok) return { price: 0, priceChange24hr: 0, hasTWDPair: false };

        const data = await response.json();
        const twdPrice = data.data?.priceTWD || 0;
        const priceChangePercent = data.data?.priceChangePercent || 0;

        return {
          price: twdPrice,
          priceChange24hr: priceChangePercent,
          hasTWDPair: twdPrice > 0,
        };
      } catch {
        return { price: 0, priceChange24hr: 0, hasTWDPair: false };
      }
    }

    // 其他加密貨幣從 BitoPro 取得價格
    try {
      const pair = `${symbol.toLowerCase()}_twd`;
      const response = await fetch(`/api/bitopro/ticker/${pair}`);
      if (!response.ok) return { price: 0, priceChange24hr: 0, hasTWDPair: false };

      const data = await response.json();
      const price = parseFloat(data.data?.lastPrice) || 0;
      return {
        price,
        priceChange24hr: parseFloat(data.data?.priceChange24hr) || 0,
        hasTWDPair: price > 0,
      };
    } catch {
      return { price: 0, priceChange24hr: 0, hasTWDPair: false };
    }
  };

  // 獲取資產資料
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 從 Notion 取得資產資料
      const response = await fetch('/api/notion/assets');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch assets from Notion');
      }

      const data = await response.json();
      const notionAssets: NotionAsset[] = data.data || [];

      // 為每個資產獲取價格和24小時變化
      const assetsWithPrices: AssetDisplay[] = await Promise.all(
        notionAssets.map(async (asset: NotionAsset) => {
          const symbol = asset.target.toUpperCase();
          const { price, priceChange24hr, hasTWDPair } = await fetchTickerData(symbol);
          const valueTWD = hasTWDPair ? asset.totalQuantity * price : 0;

          return {
            symbol,
            name: symbol,
            quantity: asset.totalQuantity,
            totalAmount: asset.totalAmount,
            price,
            priceChange24hr,
            valueTWD,
            hasTWDPair,
          };
        })
      );

      // 按市值排序，有價格的在前面
      assetsWithPrices.sort((a, b) => {
        if (a.hasTWDPair && !b.hasTWDPair) return -1;
        if (!a.hasTWDPair && b.hasTWDPair) return 1;
        return b.valueTWD - a.valueTWD;
      });

      setAssets(assetsWithPrices);

      // 從 Yahoo Finance 取得 USD/TWD 匯率
      try {
        const fxResponse = await fetch('/api/yahoo/fx');
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

      // 取得恐懼貪婪指數
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // 計算有價格的資產總價值 (TWD)
  const totalValueTWD = assets
    .filter(asset => asset.hasTWDPair)
    .reduce((sum, asset) => sum + asset.valueTWD, 0);

  // 計算總成本
  const totalCost = assets
    .filter(asset => asset.hasTWDPair)
    .reduce((sum, asset) => sum + asset.totalAmount, 0);

  // 計算總損益和損益率
  const totalProfitLoss = totalValueTWD - totalCost;
  const totalProfitLossRate = totalCost > 0
    ? ((totalValueTWD - totalCost) / totalCost) * 100
    : 0;

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


  return (
    <DashboardLayout title="資產總覽">
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
            <p className="text-2xl font-semibold text-white tabular-nums">
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
              <p className="text-sm font-medium text-neutral-400">總損益</p>
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
              <p className="text-2xl font-semibold text-neutral-100">...</p>
            ) : (
              <>
                <p className={`text-2xl font-semibold tabular-nums ${totalProfitLoss >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                  {totalProfitLoss >= 0 ? '+' : ''}NT$ {formatAmount(totalProfitLoss, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  總成本: NT$ {formatAmount(totalCost, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
              <div className="text-sm font-semibold text-neutral-100 space-y-1">
                <p className="tabular-nums">1 USD = NT$ {exchangeRates.USD}</p>
                <p className="tabular-nums text-xs text-neutral-400">USD/TWD</p>
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
                    className="text-2xl font-bold tabular-nums"
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

      {/* 資產配置圓餅圖 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-100">資產配置</h3>
          <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setChartMode('value')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartMode === 'value'
                  ? 'bg-neutral-700 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
                }`}
            >
              現值比例
            </button>
            <button
              onClick={() => setChartMode('cost')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartMode === 'cost'
                  ? 'bg-neutral-700 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
                }`}
            >
              成本比例
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-neutral-400">載入中...</p>
            </div>
          ) : (
            <AssetPieChart
              assets={assets}
              mode={chartMode}
              showAmounts={showAmounts}
            />
          )}
        </CardContent>
      </Card>

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
              <div className="hidden md:flex px-6 py-3 border-b border-neutral-800 items-center justify-between bg-neutral-800/50">
                <span className="text-xs font-medium text-neutral-400 uppercase">資產</span>
                <div className="flex items-center gap-6">
                  <span className="text-xs font-medium text-neutral-400 uppercase text-right w-24">數量</span>
                  <span className="text-xs font-medium text-neutral-400 uppercase text-right w-28">成本</span>
                  <span className="text-xs font-medium text-neutral-400 uppercase text-right min-w-[120px]">現值 (TWD)</span>
                  <span className="text-xs font-medium text-neutral-400 uppercase text-right w-24">損益率</span>
                </div>
              </div>
              {/* 資產列表 */}
              <div className="divide-y divide-neutral-800">
                {assets.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="px-4 md:px-6 py-4 hover:bg-neutral-800/50 transition-colors"
                  >
                    {/* 手機版佈局 */}
                    <div className="md:hidden">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${asset.hasTWDPair ? 'bg-primary-900/50' : 'bg-neutral-800'}`}>
                            <span className={`text-sm font-semibold ${asset.hasTWDPair ? 'text-primary-400' : 'text-neutral-500'}`}>
                              {asset.symbol.substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-neutral-100">{asset.symbol}</p>
                              {asset.hasTWDPair && asset.priceChange24hr !== 0 && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${asset.priceChange24hr > 0 ? 'bg-success-900/30 text-success-400' : 'bg-danger-900/30 text-danger-400'}`}>
                                  {asset.priceChange24hr > 0 ? '+' : ''}{asset.priceChange24hr.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* 損益率 */}
                        {asset.hasTWDPair && asset.totalAmount > 0 && (
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${asset.hasTWDPair ? 'bg-primary-900/50' : 'bg-neutral-800'}`}>
                          <span className={`text-sm font-semibold ${asset.hasTWDPair ? 'text-primary-400' : 'text-neutral-500'}`}>
                            {asset.symbol.substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-neutral-100">{asset.symbol}</p>
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
                                {exchangeRates?.USD && exchangeRates.USD > 0 && (
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
                              {exchangeRates?.USD && exchangeRates.USD > 0 && (
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
                          {asset.hasTWDPair && asset.totalAmount > 0 ? (
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
    </DashboardLayout>
  );
}


