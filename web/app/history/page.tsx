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
  0: '掛單中',
  1: '掛單中(部分成交)',
  2: '已成交',
  3: '已成交(部分成交)',
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

  // 多選相關狀態
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null);

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

  // 處理訂單選取
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // 全選/取消全選
  const handleSelectAll = () => {
    const filteredOrders = orders.filter((order) => {
      if (selectedStatus === 'all') return true;
      const orderStatus = statusMap[order.status] || 'unknown';
      return orderStatus === selectedStatus;
    });

    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  // 新增紀錄到 Notion
  const handleAddToNotion = async () => {
    if (selectedOrders.size === 0) return;

    setIsAdding(true);
    setAddResult(null);

    try {
      // 將選取的訂單轉換為 Notion 格式
      const ordersToAdd = orders
        .filter(o => selectedOrders.has(o.id))
        .map(order => {
          const pair = order.pair.split('_')[0].toUpperCase(); // 取得幣種 (如 BTC)
          const date = new Date(order.createdTimestamp).toISOString().split('T')[0]; // YYYY-MM-DD
          const quantity = parseFloat(order.executedAmount) || parseFloat(order.originalAmount);
          const total = parseFloat(order.total) || (parseFloat(order.price) * quantity);
          const isSell = order.action.toLowerCase() === 'sell';

          return {
            target: pair,
            date: date,
            quantity: isSell ? -quantity : quantity, // 賣出為負數
            amount: isSell ? -total : total,          // 賣出為負數
          };
        });

      const response = await fetch('/api/notion/assets/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: ordersToAdd }),
      });

      const data = await response.json();

      if (response.ok) {
        setAddResult({ success: true, message: data.message });
        setSelectedOrders(new Set()); // 清空選取
        setShowConfirmDialog(false);
      } else {
        setAddResult({ success: false, message: data.error || '新增失敗' });
      }
    } catch (err) {
      setAddResult({ success: false, message: '新增失敗，請稍後再試' });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <DashboardLayout title="訂單紀錄">
      {/* 過濾器 */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 items-start">
            {/* 幣種選擇 */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">幣種</label>
              <div className="flex flex-wrap gap-2">
                {availablePairs.map((pair) => (
                  <button
                    key={pair.value}
                    onClick={() => handlePairToggle(pair.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${selectedPairs.includes(pair.value)
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                  >
                    {pair.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 狀態篩選 */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">狀態</label>
              <div className="flex flex-wrap gap-2">
                {[{ value: 'all', label: '全部' }, { value: '掛單中', label: '掛單中' }, { value: '已完成', label: '已完成' }, { value: '部分成交', label: '部分成交' }, { value: '已取消', label: '已取消' }].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${selectedStatus === status.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
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
            <div className="flex items-center gap-4">
              <h3 className="text-base font-semibold text-neutral-100">
                訂單 ({orders.length})
              </h3>
              {selectedOrders.size > 0 && (
                <span className="text-sm text-neutral-400">
                  已選取 {selectedOrders.size} 筆
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedOrders.size > 0 && (
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  variant="primary"
                  size="sm"
                >
                  新增紀錄
                </Button>
              )}
              <Button
                onClick={() => setSelectedOrders(new Set())}
                variant="secondary"
                size="sm"
                disabled={selectedOrders.size === 0}
              >
                取消選取
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!isConfigured ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400 mb-2">尚未設定 API 憑證</p>
              <Link href="/settings" className="text-sm text-primary-400 hover:underline">
                前往設定頁面設定
              </Link>
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-danger-400">{error}</p>
              <button onClick={fetchOrders} className="mt-2 text-sm text-primary-400 hover:underline">
                重試
              </button>
            </div>
          ) : loading ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">載入中...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">無訂單紀錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="px-3 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size > 0 && selectedOrders.size === orders.filter((order) => {
                          if (selectedStatus === 'all') return true;
                          const orderStatus = statusMap[order.status] || 'unknown';
                          return orderStatus === selectedStatus;
                        }).length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-primary-600 rounded border-neutral-600 bg-neutral-800 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      幣種
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      類型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      方向
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      數量
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      價格
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      總額
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      狀態
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
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
                        <tr
                          key={order.id}
                          className={`hover:bg-neutral-800/50 transition-colors ${selectedOrders.has(order.id) ? 'bg-primary-900/20' : ''}`}
                        >
                          <td className="px-3 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.id)}
                              onChange={() => handleOrderSelect(order.id)}
                              className="w-4 h-4 text-primary-600 rounded border-neutral-600 bg-neutral-800 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400 tabular-nums">
                            {formatTimestamp(order.createdTimestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-100">
                            {order.pair.replace('_', '/').toUpperCase()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400 capitalize">
                            {order.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`font-medium ${order.action.toLowerCase() === 'buy' ? 'text-success-400' : 'text-danger-400'
                                }`}
                            >
                              {order.action.toLowerCase() === 'buy' ? '買入' : '賣出'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-100 text-right tabular-nums">
                            {amount.toLocaleString('en-US', { maximumFractionDigits: 8 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-100 text-right tabular-nums">
                            NT$ {price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-100 text-right tabular-nums">
                            NT$ {total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${status.includes('已成交')
                                  ? 'bg-success-900/30 text-success-400'
                                  : status.includes('已取消')
                                    ? 'bg-danger-900/30 text-danger-400'
                                    : status.includes('部分成交')
                                      ? 'bg-warning-900/30 text-warning-400'
                                      : 'bg-primary-900/30 text-primary-400'
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

      {/* 確認對話框 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden border border-neutral-800">
            <div className="px-6 py-4 border-b border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-100">確認新增紀錄</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-neutral-400 mb-4">
                確定要將選取的 {selectedOrders.size} 筆訂單加入到資產紀錄嗎？
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {orders
                  .filter(o => selectedOrders.has(o.id))
                  .map(order => {
                    const isSell = order.action.toLowerCase() === 'sell';
                    const total = parseFloat(order.total) || 0;
                    return (
                      <div key={order.id} className="flex items-center justify-between text-sm py-1 border-b border-neutral-800">
                        <span className="font-medium text-neutral-100">{order.pair.split('_')[0].toUpperCase()}</span>
                        <span className={isSell ? 'text-danger-400' : 'text-success-400'}>
                          {isSell ? '賣出' : '買入'} NT$ {total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="px-6 py-4 bg-neutral-800/50 flex justify-end gap-2">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="secondary"
                size="sm"
                disabled={isAdding}
              >
                取消
              </Button>
              <Button
                onClick={handleAddToNotion}
                variant="primary"
                size="sm"
                disabled={isAdding}
              >
                {isAdding ? '新增中...' : '確認新增'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 結果提示 */}
      {addResult && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-6 py-3 rounded-lg shadow-lg ${addResult.success ? 'bg-success-600' : 'bg-danger-600'
            } text-white flex items-center gap-3`}>
            <span className="text-sm font-medium">{addResult.message}</span>
            <button
              onClick={() => setAddResult(null)}
              className="text-white hover:opacity-80"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

