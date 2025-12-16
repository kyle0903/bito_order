'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';

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
  available: number;
}

export default function Home() {
  const [assets, setAssets] = useState<AssetDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/bitopro/balance');

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();

      // 轉換 API 回傳資料格式，並過濾掉餘額為 0 的資產
      const formattedAssets: AssetDisplay[] = (data.data || [])
        .filter((asset: Asset) => parseFloat(asset.amount) > 0)
        .map((asset: Asset) => ({
          symbol: asset.currency.toUpperCase(),
          name: asset.currency.toUpperCase(),
          balance: parseFloat(asset.amount),
          available: parseFloat(asset.available),
        }));

      setAssets(formattedAssets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      {/* 總覽統計 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-neutral-500 mb-1">Assets Count</p>
            <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {loading ? '...' : assets.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-neutral-500 mb-1">Status</p>
            <p className="text-2xl font-semibold text-neutral-900">
              {loading ? 'Loading...' : error ? 'Error' : 'Connected'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 資產列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">Assets</h3>
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
          ) : assets.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">No assets found</p>
            </div>
          ) : (
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
                      <p className="text-sm font-semibold text-neutral-900">{asset.symbol}</p>
                      <p className="text-xs text-neutral-500">{asset.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900 tabular-nums">
                        {asset.balance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8,
                        })}
                      </p>
                      <p className="text-xs text-neutral-500">Total</p>
                    </div>

                    <div className="text-right min-w-[120px]">
                      <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                        {asset.available.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8,
                        })}
                      </p>
                      <p className="text-xs text-neutral-500">Available</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

