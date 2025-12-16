'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Select from '@/components/Select';

const pairs = [
  { value: '', label: 'Select trading pair' },
  { value: 'BTC_TWD', label: 'BTC/TWD' },
  { value: 'ETH_TWD', label: 'ETH/TWD' },
  { value: 'USDT_TWD', label: 'USDT/TWD' },
];

const orderTypes = [
  { value: 'market', label: 'Market Order' },
  { value: 'limit', label: 'Limit Order' },
];

export default function TradingPage() {
  const [pair, setPair] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPrice = 1350000; // Mock price

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
    <DashboardLayout title="Trading">
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
                    <p className="text-xl font-semibold text-neutral-900 tabular-nums">
                      ${currentPrice.toLocaleString()}
                    </p>
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
            <CardHeader>
              <h3 className="text-sm font-semibold text-neutral-900">Balance</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">TWD</span>
                <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                  $150,000.00
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">BTC</span>
                <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                  0.5234
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">ETH</span>
                <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                  8.432
                </span>
              </div>
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
                    ${(parseFloat(amount || '0') * currentPrice).toLocaleString()}
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
