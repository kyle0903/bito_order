'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import { useCredentials } from '@/hooks/useCredentials';
import { fetchWithCredentials } from '@/lib/api';
import Link from 'next/link';
import Button from '@/components/Button';

interface Order {
  id: string;
  pair: string;
  type: string;
  action: string;
  price: string;
  originalAmount: string;
  executedAmount: string;
  avgExecutionPrice: string;
  total: string;
  status: number;
  createdTimestamp: number;
  updatedTimestamp: number;
}

// 狀態對應 (API 回傳的 status)
const statusMap: Record<number, string> = {
  1: '掛單中',
  2: '已完成',
  3: '部分成交',
  4: '已取消',
};

// 可選幣種
const availablePairs = [
  { value: 'btc_twd', label: 'BTC/TWD' },
  { value: 'eth_twd', label: 'ETH/TWD' },
  { value: 'ada_twd', label: 'ADA/TWD' },
  { value: 'usdt_twd', label: 'USDT/TWD' },
  { value: 'usdc_twd', label: 'USDC/TWD' },
];

export default function HistoryPage() {
  const { credentials, isConfigured } = useCredentials();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 過濾器狀態
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const fetchOrders = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 構建 query string（只有幣種）
      const params = new URLSearchParams();
      if (selectedPairs.length > 0) params.set('pairs', selectedPairs.join(','));
      
      const response = await fetchWithCredentials(
        `/api/bitopro/orders?${params.toString()}`, 
        credentials
      );

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }


      const data = await response.json();
      setOrders(data.data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [credentials, isConfigured, selectedPairs]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePairToggle = (pair: string) => {
    setSelectedPairs(prev => 
      prev.includes(pair) 
        ? prev.filter(p => p !== pair)
        : [...prev, pair]
    );
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <DashboardLayout title="訂單紀錄">
      {/* 過濾器 */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 items-start">
            {/* 幣種選擇 */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-2">幣種</label>
              <div className="flex flex-wrap gap-2">
                {availablePairs.map((pair) => (
                  <button
                    key={pair.value}
                    onClick={() => handlePairToggle(pair.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      selectedPairs.includes(pair.value)
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {pair.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 狀態篩選 */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-2">狀態</label>
              <div className="flex flex-wrap gap-2">
                {[{ value: 'all', label: '全部' }, { value: '掛單中', label: '掛單中' }, { value: '已完成', label: '已完成' }, { value: '部分成交', label: '部分成交' }, { value: '已取消', label: '已取消' }].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      selectedStatus === status.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* 90 天限制提醒 */}
          <p className="mt-3 text-xs text-neutral-500">
            ⚠️ BitoPro API 限制：僅顯示最近 90 天的訂單紀錄
          </p>
        </CardContent>
      </Card>

      {/* 訂單列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-900">
              訂單 ({orders.length})
            </h3>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!isConfigured ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500 mb-2">尚未設定 API 憑證</p>
              <Link href="/settings" className="text-sm text-primary-600 hover:underline">
                前往設定頁面設定
              </Link>
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-danger-600">{error}</p>
              <button onClick={fetchOrders} className="mt-2 text-sm text-primary-600 hover:underline">
                重試
              </button>
            </div>
          ) : loading ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">載入中...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">無訂單紀錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      幣種
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      類型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      方向
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      數量
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      價格
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      總額
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      狀態
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {orders
                    .filter((order) => {
                      if (selectedStatus === 'all') return true;
                      const orderStatus = statusMap[order.status] || 'unknown';
                      return orderStatus === selectedStatus;
                    })
                    .map((order) => {
                    // 使用掛單價格和原始數量
                    const price = parseFloat(order.price) || 0;
                    const amount = parseFloat(order.originalAmount) || 0;
                    const total = parseFloat(order.total) || (price * amount);
                    const status = statusMap[order.status] || '未知';

                    return (
                      <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 tabular-nums">
                          {formatTimestamp(order.createdTimestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {order.pair.replace('_', '/').toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 capitalize">
                          {order.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`font-medium ${
                              order.action.toLowerCase() === 'buy' ? 'text-success-600' : 'text-danger-600'
                            }`}
                          >
                            {order.action.toLowerCase() === 'buy' ? '買入' : '賣出'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 text-right tabular-nums">
                          {amount.toLocaleString('en-US', { maximumFractionDigits: 8 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 text-right tabular-nums">
                          NT$ {price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 text-right tabular-nums">
                          NT$ {total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${
                                status === '已完成'
                                  ? 'bg-success-100 text-success-700'
                                  : status === '已取消'
                                  ? 'bg-danger-100 text-danger-700'
                                  : status === '部分成交'
                                  ? 'bg-warning-100 text-warning-700'
                                  : 'bg-primary-100 text-primary-700'
                              }
                            `}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

