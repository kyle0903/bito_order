'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Select from '@/components/Select';
import { useCredentials } from '@/hooks/useCredentials';
import { useBitoProWebSocket } from '@/hooks/useBitoProWebSocket';
import { fetchWithCredentials } from '@/lib/api';
import Link from 'next/link';

interface Asset {
  currency: string;
  amount: string;
  available: string;
}

interface BalanceDisplay {
  symbol: string;
  balance: number;
}

interface OpenOrder {
  id: string;
  pair: string;
  action: string;
  price: string;
  originalAmount: string;
  executedAmount: string;
  status: number;
  createdTimestamp: number;
}

const pairs = [
  { value: '', label: '選擇交易對' },
  { value: 'BTC_TWD', label: 'BTC/TWD' },
  { value: 'ETH_TWD', label: 'ETH/TWD' },
  { value: 'ADA_TWD', label: 'ADA/TWD' }
];

const orderTypes = [
  { value: 'market', label: '市價單' },
  { value: 'limit', label: '限價單' },
];

export default function TradingPage() {
  const { credentials, isConfigured } = useCredentials();
  const [pair, setPair] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [inputAmount, setInputAmount] = useState(''); // 輸入的金額 (TWD)
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<BalanceDisplay[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string } | null>(null);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // 使用 WebSocket 獲取即時價格
  const { data: wsData, isConnected: wsConnected } = useBitoProWebSocket(pair);
  const bestBid = wsData?.bestBid ?? null;
  const bestAsk = wsData?.bestAsk ?? null;
  const currentPrice = wsData?.lastPrice ?? null;

  // 獲取餘額
  const fetchBalance = useCallback(async () => {
    if (!isConfigured) {
      setBalanceLoading(false);
      return;
    }

    try {
      setBalanceLoading(true);
      const response = await fetchWithCredentials('/api/bitopro/balance', credentials);

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();

      // 過濾並轉換餘額資料
      const formattedBalances: BalanceDisplay[] = (data.data || [])
        .filter((asset: Asset) => parseFloat(asset.amount) > 0.0001)
        .map((asset: Asset) => ({
          symbol: asset.currency.toUpperCase(),
          balance: parseFloat(asset.amount),
        }));

      setBalances(formattedBalances);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    } finally {
      setBalanceLoading(false);
    }
  }, [credentials, isConfigured]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // 獲取掛單
  const fetchOpenOrders = useCallback(async () => {
    if (!isConfigured) {
      setOrdersLoading(false);
      return;
    }

    try {
      setOrdersLoading(true);
      // 取得所有交易對的掛單
      const allOrders: OpenOrder[] = [];

      for (const p of pairs.filter(p => p.value)) {
        const response = await fetchWithCredentials(
          `/api/bitopro/orders?pairs=${p.value.toLowerCase()}`,
          credentials
        );
        if (response.ok) {
          const data = await response.json();
          // 只取狀態為 0 掛單中 或 1 掛單中(部分成交) 的訂單
          const openOrdersForPair = (data.data || []).filter(
            (o: OpenOrder) => o.status === 0 || o.status === 1
          );
          allOrders.push(...openOrdersForPair);
        }
      }

      setOpenOrders(allOrders);
    } catch (err) {
      console.error('Failed to fetch open orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [credentials, isConfigured]);

  useEffect(() => {
    fetchOpenOrders();
  }, [fetchOpenOrders]);

  // 取消訂單
  const cancelOrder = async (orderId: string, orderPair: string) => {
    setCancellingOrderId(orderId);
    try {
      const response = await fetchWithCredentials('/api/bitopro/order/cancel', credentials, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: orderPair.toLowerCase(), orderId }),
      });

      if (response.ok) {
        setOrderResult({ success: true, message: '訂單已取消' });
        fetchOpenOrders();
        fetchBalance();
      } else {
        const data = await response.json();
        setOrderResult({ success: false, message: data.error || '取消失敗' });
      }
    } catch (err) {
      setOrderResult({ success: false, message: '取消訂單失敗' });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent, orderSide: 'buy' | 'sell') => {
    e.preventDefault();

    if (!isConfigured) {
      setOrderResult({ success: false, message: '請先設定 API 憑證' });
      return;
    }

    if (!pair || !amount) {
      setOrderResult({ success: false, message: '請選擇交易對並輸入數量' });
      return;
    }

    if (orderType === 'limit' && !price) {
      setOrderResult({ success: false, message: '限價單請輸入價格' });
      return;
    }

    setSide(orderSide);
    setLoading(true);
    setOrderResult(null);

    try {
      const orderData = {
        pair: pair.toLowerCase(),
        action: orderSide,
        amount: amount,
        ...(orderType === 'limit' && { price: price }),
        type: orderType
      };

      const response = await fetchWithCredentials('/api/bitopro/order', credentials, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (response.ok && data.orderId) {
        setOrderResult({
          success: true,
          message: `訂單已建立！訂單編號: ${data.orderId}`
        });
        // 清空表單
        setAmount('');
        setPrice('');
        // 重新獲取餘額
        fetchBalance();
      } else {
        setOrderResult({
          success: false,
          message: data.error || data.message || '訂單建立失敗'
        });
      }
    } catch (err) {
      console.error('Failed to create order:', err);
      setOrderResult({
        success: false,
        message: err instanceof Error ? err.message : '訂單建立失敗'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="交易">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：交易表單 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-neutral-100">下單</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 交易對選擇 */}
                <Select
                  label="交易對"
                  options={pairs}
                  value={pair}
                  onChange={(e) => setPair(e.target.value)}
                  required
                />

                {/* 當前價格 */}
                {pair && (
                  <div className="p-4 bg-neutral-800 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-neutral-400">目前價格</p>
                        <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-success-500 animate-pulse' : 'bg-neutral-600'}`} />
                      </div>
                      <p className="text-xs text-neutral-500">{wsConnected ? '即時更新' : '連線中...'}</p>
                    </div>
                    {!wsConnected && bestBid === null ? (
                      <p className="text-xl font-semibold text-neutral-500">連線中...</p>
                    ) : bestBid !== null && bestAsk !== null ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-success-400 mb-1">買入價 (Bid)</p>
                          <p className="text-lg font-semibold text-success-400 tabular-nums">
                            NT$ {bestBid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-danger-400 mb-1">賣出價 (Ask)</p>
                          <p className="text-lg font-semibold text-danger-400 tabular-nums">
                            NT$ {bestAsk.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xl font-semibold text-danger-400">連線失敗</p>
                    )}
                  </div>
                )}

                {/* 訂單類型 */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    訂單類型
                  </label>
                  <div className="flex gap-2">
                    {orderTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setOrderType(type.value)}
                        className={`
                          flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors
                          ${orderType === type.value
                            ? 'bg-primary-600 text-white'
                            : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
                          }
                        `}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 限價單價格輸入 */}
                {orderType === 'limit' && (
                  <Input
                    label="限價價格 (TWD)"
                    type="number"
                    placeholder="輸入價格"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    helperText={price && currentPrice ?
                      (parseFloat(price) < currentPrice ? '低於市價，可能需等待成交' : '高於市價，可能立即成交')
                      : undefined
                    }
                  />
                )}

                {/* 金額輸入 (限價單用金額自動算數量) */}
                <Input
                  label={orderType === 'limit' ? '金額 (TWD)' : `數量${pair ? ` (${pair.split('_')[0]})` : ''}`}
                  type="number"
                  placeholder={orderType === 'limit' ? '輸入金額' : '輸入數量'}
                  value={orderType === 'limit' ? inputAmount : amount}
                  onChange={(e) => {
                    if (orderType === 'limit') {
                      setInputAmount(e.target.value);
                      // 用限價價格或當前價格計算數量
                      const priceToUse = parseFloat(price) || currentPrice || 0;
                      if (priceToUse > 0 && e.target.value) {
                        const calcAmount = parseFloat(e.target.value) / priceToUse;
                        if (!isNaN(calcAmount) && isFinite(calcAmount)) {
                          setAmount(calcAmount.toFixed(8));
                        }
                      }
                    } else {
                      setAmount(e.target.value);
                    }
                  }}
                  helperText={orderType === 'limit' && inputAmount && (parseFloat(price) || currentPrice) ?
                    `≈ ${(parseFloat(inputAmount) / (parseFloat(price) || currentPrice || 1)).toFixed(8)} ${pair ? pair.split('_')[0] : ''}`
                    : undefined
                  }
                />

                {/* 買入/賣出按鈕 */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    variant="success"
                    size="lg"
                    loading={loading && side === 'buy'}
                    onClick={(e) => handleSubmit(e, 'buy')}
                    disabled={!pair || !amount || loading}
                  >
                    買入
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="lg"
                    loading={loading && side === 'sell'}
                    onClick={(e) => handleSubmit(e, 'sell')}
                    disabled={!pair || !amount || loading}
                  >
                    賣出
                  </Button>
                </div>

                {/* 結果提示 */}
                {orderResult && (
                  <div className={`p-4 rounded-lg ${orderResult.success ? 'bg-success-900/30 text-success-300' : 'bg-danger-900/30 text-danger-300'}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{orderResult.message}</p>
                      <button
                        onClick={() => setOrderResult(null)}
                        className="text-current opacity-70 hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右側：餘額與訂單資訊 */}
        <div className="space-y-6">
          {/* 餘額卡片 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-100">餘額</h3>
              <button
                onClick={fetchBalance}
                disabled={balanceLoading}
                className="text-xs text-primary-400 hover:text-primary-300 disabled:opacity-50"
              >
                {balanceLoading ? '載入中...' : '重新整理'}
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isConfigured ? (
                <div className="text-center py-2">
                  <p className="text-sm text-neutral-400 mb-2">尚未設定 API 憑證</p>
                  <Link href="/settings" className="text-xs text-primary-400 hover:underline">
                    前往設定
                  </Link>
                </div>
              ) : balanceLoading ? (
                <p className="text-sm text-neutral-400">載入餘額中...</p>
              ) : balances.length === 0 ? (
                <p className="text-sm text-neutral-400">找不到餘額</p>
              ) : (
                balances.map((item) => (
                  <div key={item.symbol} className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">{item.symbol}</span>
                    <span className="text-sm font-semibold text-neutral-100 tabular-nums">
                      {item.balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 掛單委託 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-100">掛單委託</h3>
              <button
                onClick={fetchOpenOrders}
                disabled={ordersLoading}
                className="text-xs text-primary-400 hover:text-primary-300 disabled:opacity-50"
              >
                {ordersLoading ? '載入中...' : '重新整理'}
              </button>
            </CardHeader>
            <CardContent className="space-y-2">
              {!isConfigured ? (
                <p className="text-sm text-neutral-400">尚未設定 API 憑證</p>
              ) : ordersLoading ? (
                <p className="text-sm text-neutral-400">載入掛單中...</p>
              ) : openOrders.length === 0 ? (
                <p className="text-sm text-neutral-400">無掛單委託</p>
              ) : (
                openOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 bg-neutral-800 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-100">
                          {order.pair.replace('_', '/').toUpperCase()}
                        </span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${order.action.toLowerCase() === 'buy'
                          ? 'bg-success-900/30 text-success-400'
                          : 'bg-danger-900/30 text-danger-400'
                          }`}>
                          {order.action.toLowerCase() === 'buy' ? '買' : '賣'}
                        </span>
                      </div>
                      <button
                        onClick={() => cancelOrder(order.id, order.pair)}
                        disabled={cancellingOrderId === order.id}
                        className="text-xs text-danger-400 hover:text-danger-300 disabled:opacity-50"
                      >
                        {cancellingOrderId === order.id ? '取消中...' : '取消'}
                      </button>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>價格: NT$ {parseFloat(order.price).toLocaleString()}</span>
                      <span>數量: {parseFloat(order.originalAmount).toFixed(6)}</span>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(order.createdTimestamp).toLocaleString('zh-TW')}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 訂單摘要 */}
          {pair && amount && (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-neutral-100">訂單摘要</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">類型</span>
                  <span className="font-medium text-neutral-100">
                    {orderType === 'market' ? '市價' : '限價'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">數量</span>
                  <span className="font-medium text-neutral-100 tabular-nums">
                    {amount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">預估總額</span>
                  <span className="font-semibold text-neutral-100 tabular-nums">
                    NT$ {(parseFloat(amount || '0') * (orderType === 'limit' && price ? parseFloat(price) : (currentPrice || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
