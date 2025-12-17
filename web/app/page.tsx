'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Link from 'next/link';

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

export default function Home() {
  const [assets, setAssets] = useState<AssetDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

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

  // 統計有/無價格的資產數量
  const assetsWithoutPrice = assets.filter(a => !a.hasTWDPair);


  return (
    <DashboardLayout title="資產總覽">
      {/* 總覽統計 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-neutral-500">總資產價值</p>
              {!loading && totalChange24hr !== 0 && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  totalChange24hr > 0 
                    ? 'bg-success-50 text-success-600' 
                    : 'bg-danger-50 text-danger-600'
                }`}>
                  {totalChange24hr > 0 ? '+' : ''}{totalChange24hr.toFixed(2)}% (24h)
                </span>
              )}
            </div>
            <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {loading ? '...' : `NT$ ${totalValueTWD.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </p>
            {!loading && exchangeRates?.USD && exchangeRates.USD > 0 && (
              <p className="text-sm text-neutral-500 tabular-nums mt-1">
                ≈ ${totalValueUSD.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USD
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-neutral-500 mb-1">匯率</p>
            {!exchangeRates ? (
              <p className="text-lg font-semibold text-neutral-900">Loading...</p>
            ) : exchangeRates.USD > 0 ? (
              <div className="text-sm font-semibold text-neutral-900 space-y-1">
                <p className="tabular-nums">1 USD = NT$ {exchangeRates.USD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="tabular-nums text-xs text-neutral-500">USD/TWD Rate (Yahoo Finance)</p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-danger-600">Failed</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 資產列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">資產列表</h3>
          <button
            onClick={fetchAssets}
            disabled={loading}
            className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            {loading ? '載入中...' : '重新整理'}
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-danger-600">{error}</p>
              <button
                onClick={fetchAssets}
                className="mt-2 text-sm text-primary-600 hover:underline"
              >
                重試
              </button>
            </div>
          ) : loading ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">載入資產中...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">未找到資產</p>
              <p className="mt-1 text-xs text-neutral-400">請確認 Notion 環境變數已正確設定</p>
            </div>
          ) : (
            <div>
              {/* 表頭 */}
              <div className="px-6 py-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
                <span className="text-xs font-medium text-neutral-500 uppercase">資產</span>
                <div className="flex items-center gap-6">
                  <span className="text-xs font-medium text-neutral-500 uppercase text-right w-24">數量</span>
                  <span className="text-xs font-medium text-neutral-500 uppercase text-right w-28">成本</span>
                  <span className="text-xs font-medium text-neutral-500 uppercase text-right min-w-[120px]">現值 (TWD)</span>
                </div>
              </div>
              {/* 資產列表 */}
              <div className="divide-y divide-neutral-200">
              {assets.map((asset) => (
                <div
                  key={asset.symbol}
                  className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      asset.hasTWDPair ? 'bg-primary-100' : 'bg-neutral-100'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        asset.hasTWDPair ? 'text-primary-600' : 'text-neutral-400'
                      }`}>
                        {asset.symbol.substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900">{asset.symbol}</p>
                        {asset.hasTWDPair && asset.priceChange24hr !== 0 && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            asset.priceChange24hr > 0 
                              ? 'bg-success-50 text-success-600' 
                              : 'bg-danger-50 text-danger-600'
                          }`}>
                            {asset.priceChange24hr > 0 ? '+' : ''}{asset.priceChange24hr.toFixed(2)}%
                          </span>
                        )}
                        {!asset.hasTWDPair && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
                            無價格
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {asset.hasTWDPair ? (
                          <>
                            <p>NT$ {asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            {exchangeRates?.USD && exchangeRates.USD > 0 && (
                              <p>≈ ${(asset.price / exchangeRates.USD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</p>
                            )}
                          </>
                        ) : (
                          <span className="text-neutral-400">無法取得 TWD 交易對</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* 數量 */}
                    <div className="text-right w-24">
                      <p className="text-sm font-medium text-neutral-900 tabular-nums">
                        {asset.quantity.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8,
                        })}
                      </p>
                    </div>

                    {/* 成本 */}
                    <div className="text-right w-28">
                      <p className="text-sm font-medium text-neutral-700 tabular-nums">
                        NT$ {asset.totalAmount.toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>

                    {/* 現值 */}
                    <div className="text-right min-w-[120px]">
                      {asset.hasTWDPair ? (
                        <>
                          <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                            NT$ {asset.valueTWD.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          {exchangeRates?.USD && exchangeRates.USD > 0 && (
                            <p className="text-xs text-neutral-500 tabular-nums">
                              ≈ ${(asset.valueTWD / exchangeRates.USD).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} USD
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm font-medium text-neutral-400 tabular-nums">--</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {/* 無價格資產提示 */}
              {assetsWithoutPrice.length > 0 && (
                <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200">
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


