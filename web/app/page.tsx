'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import { useCredentials } from '@/hooks/useCredentials';
import { fetchWithCredentials } from '@/lib/api';
import Link from 'next/link';

interface Asset {
  currency: string;
  amount: string;
  available: string;
  stake: string;
}

interface AssetDisplay {
  symbol: string;
  name: string;
  balance: number;
  valueTWD: number;
  price: number;
  priceChange24hr: number;
}

interface ExchangeRates {
  USDT: number;
}

export default function Home() {
  const { credentials, isConfigured, isLoading: credentialsLoading } = useCredentials();
  const [assets, setAssets] = useState<AssetDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

  // 獲取單一交易對的價格和24小時變化
  const fetchTickerData = async (symbol: string): Promise<{ price: number; priceChange24hr: number }> => {
    // TWD 本身價值為 1，無變化
    if (symbol === 'TWD') return { price: 1, priceChange24hr: 0 };
    
    try {
      const pair = `${symbol.toLowerCase()}_twd`;
      const response = await fetch(`/api/bitopro/ticker/${pair}`);
      if (!response.ok) return { price: 0, priceChange24hr: 0 };
      
      const data = await response.json();
      return {
        price: parseFloat(data.data?.lastPrice) || 0,
        priceChange24hr: parseFloat(data.data?.priceChange24hr) || 0,
      };
    } catch {
      return { price: 0, priceChange24hr: 0 };
    }
  };

  // 獲取資產餘額並計算價值
  const fetchBalance = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithCredentials('/api/bitopro/balance', credentials);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid credentials. Please check your API settings.');
        }
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();

      // 過濾掉餘額為 0 的資產
      const filteredAssets = (data.data || [])
        .filter((asset: Asset) => parseFloat(asset.amount) > 0.0001);

      // 為每個資產獲取價格和24小時變化
      const assetsWithPrices: AssetDisplay[] = await Promise.all(
        filteredAssets.map(async (asset: Asset) => {
          const symbol = asset.currency.toUpperCase();
          const balance = parseFloat(asset.amount);
          const { price, priceChange24hr } = await fetchTickerData(symbol);
          const valueTWD = balance * price;
          
          return {
            symbol,
            name: symbol,
            balance,
            valueTWD,
            price,
            priceChange24hr,
          };
        })
      );

      setAssets(assetsWithPrices);
      setIsConnected(true);

      // 設定匯率顯示 (找 USDT 的價格)
      const usdtAsset = assetsWithPrices.find(a => a.symbol === 'USDT');
      if (usdtAsset && usdtAsset.price > 0) {
        setExchangeRates({ USDT: usdtAsset.price });
      } else {
        // 如果帳戶沒有 USDT，單獨獲取 USDT 價格
        const { price: usdtPrice } = await fetchTickerData('USDT');
        setExchangeRates({ USDT: usdtPrice });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoading(false);
    }
  }, [credentials, isConfigured]);

  // 斷開連線
  const handleDisconnect = useCallback(() => {
    setAssets([]);
    setIsConnected(false);
    setError(null);
  }, []);

  // 連接
  const handleConnect = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // 計算總資產價值 (TWD)
  const totalValueTWD = assets.reduce((sum, asset) => sum + asset.valueTWD, 0);
  
  // 計算總資產價值 (USDT)
  const totalValueUSDT = exchangeRates?.USDT && exchangeRates.USDT > 0 
    ? totalValueTWD / exchangeRates.USDT 
    : 0;

  // 計算總資產的24小時加權平均變化百分比
  const totalChange24hr = totalValueTWD > 0
    ? assets.reduce((weightedSum, asset) => {
        const weight = asset.valueTWD / totalValueTWD;
        return weightedSum + (asset.priceChange24hr * weight);
      }, 0)
    : 0;

  return (
    <DashboardLayout title="資產總覽">
      {/* 總覽統計 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-neutral-500">Total Value</p>
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
            {!loading && exchangeRates?.USDT && exchangeRates.USDT > 0 && (
              <p className="text-sm text-neutral-500 tabular-nums mt-1">
                ≈ {totalValueUSDT.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-neutral-500 mb-1">Exchange Rate</p>
            {!exchangeRates ? (
              <p className="text-lg font-semibold text-neutral-900">Loading...</p>
            ) : exchangeRates.USDT > 0 ? (
              <div className="text-sm font-semibold text-neutral-900 space-y-1">
                <p className="tabular-nums">1 USDT = NT$ {exchangeRates.USDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="tabular-nums text-xs text-neutral-500">≈ USD/TWD Rate</p>
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
          <h3 className="text-base font-semibold text-neutral-900">Assets List</h3>
          <button
            onClick={fetchBalance}
            disabled={loading}
            className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-danger-600">{error}</p>
              <button
                onClick={fetchBalance}
                className="mt-2 text-sm text-primary-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">Loading assets...</p>
            </div>
          ) : !isConfigured ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500 mb-2">API credentials not configured.</p>
              <Link 
                href="/settings" 
                className="text-sm text-primary-600 hover:underline"
              >
                Go to Settings to configure
              </Link>
            </div>
          ) : !isConnected ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">Not connected. Click Connect in the header to view assets.</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">No assets found</p>
            </div>
          ) : (
            <div>
              {/* 表頭 */}
              <div className="px-6 py-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
                <span className="text-xs font-medium text-neutral-500 uppercase">Assets</span>
                <div className="flex items-center gap-6">
                  <span className="text-xs font-medium text-neutral-500 uppercase text-right">Total</span>
                  <span className="text-xs font-medium text-neutral-500 uppercase text-right min-w-[120px]">Value</span>
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
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-neutral-600">
                        {asset.symbol.substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900">{asset.symbol}</p>
                        {asset.priceChange24hr !== 0 && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            asset.priceChange24hr > 0 
                              ? 'bg-success-50 text-success-600' 
                              : 'bg-danger-50 text-danger-600'
                          }`}>
                            {asset.priceChange24hr > 0 ? '+' : ''}{asset.priceChange24hr.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {asset.symbol === 'TWD' ? (
                          <span>Taiwan Dollar</span>
                        ) : (
                          <>
                            <p>{asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            {exchangeRates?.USDT && exchangeRates.USDT > 0 && (
                              <p>≈ {(asset.price / exchangeRates.USDT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900 tabular-nums">
                        {asset.balance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8,
                        })}
                      </p>
                    </div>

                    <div className="text-right min-w-[120px]">
                      <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                        NT$ {asset.valueTWD.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      {exchangeRates?.USDT && exchangeRates.USDT > 0 && (
                        <p className="text-xs text-neutral-500 tabular-nums">
                          ≈ USDT {(asset.valueTWD / exchangeRates.USDT).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

