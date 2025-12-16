'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';

const mockAssets = [
  { symbol: 'BTC', name: 'Bitcoin', balance: 0.5234, value: 22567.89, change: 2.45 },
  { symbol: 'ETH', name: 'Ethereum', balance: 8.432, value: 22345.12, change: -1.23 },
  { symbol: 'USDT', name: 'Tether', balance: 15230.45, value: 15230.45, change: 0.01 },
];

const mockStats = {
  totalValue: 60143.46,
  dailyChange: 1234.56,
  dailyChangePercent: 2.09,
};

export default function Home() {
  return (
    <DashboardLayout title="Dashboard">
      {/* 總覽統計 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-neutral-500 mb-1">Total Value</p>
            <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
              ${mockStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-neutral-500 mb-1">24h Change</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-success-600 tabular-nums">
                +${mockStats.dailyChange.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-sm font-medium text-success-600">
                +{mockStats.dailyChangePercent}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-neutral-500 mb-1">Assets</p>
            <p className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {mockAssets.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 資產列表 */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-neutral-900">Assets</h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-200">
            {mockAssets.map((asset) => (
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
                        maximumFractionDigits: 4,
                      })}
                    </p>
                    <p className="text-xs text-neutral-500">{asset.symbol}</p>
                  </div>

                  <div className="text-right min-w-[120px]">
                    <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                      ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p
                      className={`text-xs font-medium tabular-nums ${
                        asset.change >= 0 ? 'text-success-600' : 'text-danger-600'
                      }`}
                    >
                      {asset.change >= 0 ? '+' : ''}
                      {asset.change}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
