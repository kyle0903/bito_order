'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Select from '@/components/Select';
import { useCredentials } from '@/hooks/useCredentials';
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

const pairs = [
  { value: '', label: 'Select trading pair' },
  { value: 'BTC_TWD', label: 'BTC/TWD' },
  { value: 'ETH_TWD', label: 'ETH/TWD' },
  { value: 'ADA_TWD', label: 'ADA/TWD' }
];

const orderTypes = [
  { value: 'market', label: 'Market Order' },
  { value: 'limit', label: 'Limit Order' },
];

export default function TradingPage() {
  const { credentials, isConfigured } = useCredentials();
  const [pair, setPair] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<BalanceDisplay[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

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

  // 獲取交易對價格
  const fetchPrice = useCallback(async (tradingPair: string) => {
    if (!tradingPair) {
      setCurrentPrice(null);
      return;
    }
    
    try {
      setPriceLoading(true);
      const pairLower = tradingPair.toLowerCase();
      const response = await fetch(`/api/bitopro/ticker/${pairLower}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }

      const data = await response.json();
      setCurrentPrice(parseFloat(data.data?.lastPrice) || 0);
    } catch (err) {
      console.error('Failed to fetch price:', err);
      setCurrentPrice(null);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  // 當交易對變更時獲取價格
  useEffect(() => {
    fetchPrice(pair);
  }, [pair, fetchPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement BitoPro API call
    setTimeout(() => {
      setLoading(false);
      alert('Order submitted (mock)');
    }, 1500);
  };

  return (
    <DashboardLayout title="交易">
      <div className="grid grid-cols-3 gap-6">
        {/* 左側：交易表單 */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-neutral-900">Place Order</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 交易對選擇 */}
                <Select
                  label="Trading Pair"
                  options={pairs}
                  value={pair}
                  onChange={(e) => setPair(e.target.value)}
                  required
                />

                {/* 當前價格 */}
                {pair && (
                  <div className="p-4 bg-neutral-50 rounded-md">
                    <p className="text-xs font-medium text-neutral-500 mb-1">Current Price</p>
                    {priceLoading ? (
                      <p className="text-xl font-semibold text-neutral-400">Loading...</p>
                    ) : currentPrice !== null ? (
                      <p className="text-xl font-semibold text-neutral-900 tabular-nums">
                        NT$ {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    ) : (
                      <p className="text-xl font-semibold text-danger-600">Failed to load</p>
                    )}
                  </div>
                )}

                {/* 訂單類型 */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Order Type
                  </label>
                  <div className="flex gap-2">
                    {orderTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setOrderType(type.value)}
                        className={`
                          flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors
                          ${
                            orderType === type.value
                              ? 'bg-neutral-900 text-white'
                              : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
                          }
                        `}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 限價單價格 */}
                {orderType === 'limit' && (
                  <Input
                    label="Price"
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="0.01"
                    required
                  />
                )}

                {/* 數量 */}
                <Input
                  label="Amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.00000001"
                  required
                  helperText="Enter the amount you want to trade"
                />

                {/* 買入/賣出按鈕 */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="success"
                    size="lg"
                    loading={loading && side === 'buy'}
                    onClick={() => setSide('buy')}
                    disabled={!pair || !amount}
                  >
                    Buy
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    size="lg"
                    loading={loading && side === 'sell'}
                    onClick={() => setSide('sell')}
                    disabled={!pair || !amount}
                  >
                    Sell
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 右側：餘額與訂單資訊 */}
        <div className="space-y-6">
          {/* 餘額卡片 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">Balance</h3>
              <button
                onClick={fetchBalance}
                disabled={balanceLoading}
                className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                {balanceLoading ? 'Loading...' : 'Refresh'}
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isConfigured ? (
                <div className="text-center py-2">
                  <p className="text-sm text-neutral-500 mb-2">Credentials not configured</p>
                  <Link href="/settings" className="text-xs text-primary-600 hover:underline">
                    Go to Settings
                  </Link>
                </div>
              ) : balanceLoading ? (
                <p className="text-sm text-neutral-500">Loading balances...</p>
              ) : balances.length === 0 ? (
                <p className="text-sm text-neutral-500">No balances found</p>
              ) : (
                balances.map((item) => (
                  <div key={item.symbol} className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">{item.symbol}</span>
                    <span className="text-sm font-semibold text-neutral-900 tabular-nums">
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

          {/* 訂單摘要 */}
          {pair && amount && (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-neutral-900">Order Summary</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Type</span>
                  <span className="font-medium text-neutral-900">
                    {orderType === 'market' ? 'Market' : 'Limit'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Amount</span>
                  <span className="font-medium text-neutral-900 tabular-nums">
                    {amount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Est. Total</span>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    NT$ {(parseFloat(amount || '0') * (currentPrice || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
