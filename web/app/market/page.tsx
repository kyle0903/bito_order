'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';

interface Ticker {
  pair: string;
  lastPrice: string;
  isBuyer: boolean;
  priceChange24hr: string;
  volume24hr: string;
  high24hr: string;
  low24hr: string;
}

export default function MarketPage() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const savedOrderRef = useRef<string[] | null>(null);

  // 從 localStorage 讀取排序設定
  useEffect(() => {
    const saved = localStorage.getItem('marketDisplayOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        savedOrderRef.current = parsed;
        setDisplayOrder(parsed);
      } catch {
        // 忽略解析錯誤
      }
    }
    setIsInitialized(true);
  }, []);

  // 儲存排序設定到 localStorage
  const saveDisplayOrder = (order: string[]) => {
    localStorage.setItem('marketDisplayOrder', JSON.stringify(order));
    savedOrderRef.current = order;
  };

  // 取得 TWD 交易對價格
  const fetchTickers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/bitopro/tickers');
      if (!response.ok) {
        throw new Error('Failed to fetch tickers');
      }

      const data = await response.json();
      if (data.success) {
        const fetchedTickers: Ticker[] = data.data || [];
        setTickers(fetchedTickers);
        setLastUpdated(new Date());
        
        // 使用 savedOrderRef 來決定排序
        const currentSavedOrder = savedOrderRef.current;
        
        if (!currentSavedOrder || currentSavedOrder.length === 0) {
          // 沒有已儲存的排序，使用預設市值排序
          const sortedByMarketCap = [...fetchedTickers].sort(
            (a, b) =>
              parseFloat(b.lastPrice) * parseFloat(b.volume24hr) -
              parseFloat(a.lastPrice) * parseFloat(a.volume24hr)
          );
          const defaultOrder = sortedByMarketCap.map(t => t.pair);
          setDisplayOrder(defaultOrder);
          saveDisplayOrder(defaultOrder);
        } else {
          // 有已儲存的排序，檢查是否有新幣種
          const existingPairs = new Set(currentSavedOrder);
          const newPairs = fetchedTickers
            .filter(t => !existingPairs.has(t.pair))
            .map(t => t.pair);
          
          if (newPairs.length > 0) {
            const updatedOrder = [...currentSavedOrder, ...newPairs];
            setDisplayOrder(updatedOrder);
            saveDisplayOrder(updatedOrder);
          } else {
            // 確保 displayOrder 是最新的
            setDisplayOrder(currentSavedOrder);
          }
        }
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch tickers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始載入與自動刷新 - 等待 localStorage 讀取完成後才開始
  useEffect(() => {
    if (!isInitialized) return;
    
    fetchTickers();

    // 每 30 秒自動刷新
    const interval = setInterval(fetchTickers, 30000);
    return () => clearInterval(interval);
  }, [isInitialized, fetchTickers]);

  // 根據 displayOrder 排序的 tickers
  const orderedTickers = displayOrder
    .map(pair => tickers.find(t => t.pair === pair))
    .filter((t): t is Ticker => t !== undefined);

  // 拖放處理
  const handleDragStart = (pair: string) => {
    setDraggedItem(pair);
  };

  const handleDragOver = (e: React.DragEvent, pair: string) => {
    e.preventDefault();
    if (pair !== draggedItem) {
      setDragOverItem(pair);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetPair: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetPair) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const newOrder = [...displayOrder];
    const draggedIndex = newOrder.indexOf(draggedItem);
    const targetIndex = newOrder.indexOf(targetPair);

    // 移除拖動的項目
    newOrder.splice(draggedIndex, 1);
    // 插入到目標位置
    newOrder.splice(targetIndex, 0, draggedItem);

    setDisplayOrder(newOrder);
    saveDisplayOrder(newOrder);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // 重置為預設排序（按市值）
  const resetToDefaultOrder = () => {
    const sortedByMarketCap = [...tickers].sort(
      (a, b) =>
        parseFloat(b.lastPrice) * parseFloat(b.volume24hr) -
        parseFloat(a.lastPrice) * parseFloat(a.volume24hr)
    );
    const defaultOrder = sortedByMarketCap.map(t => t.pair);
    setDisplayOrder(defaultOrder);
    saveDisplayOrder(defaultOrder);
  };

  // 格式化交易對名稱
  const formatPairName = (pair: string): string => {
    return pair.replace('_twd', '').toUpperCase() + '/TWD';
  };

  // 取得基礎貨幣名稱
  const getBaseCurrency = (pair: string): string => {
    return pair.replace('_twd', '').toUpperCase();
  };

  // 格式化價格
  const formatPrice = (price: string): string => {
    const num = parseFloat(price);
    if (num >= 1000) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } else if (num >= 1) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    } else {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 8,
      });
    }
  };

  // 格式化成交量
  const formatVolume = (volume: string): string => {
    const num = parseFloat(volume);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else {
      return num.toFixed(2);
    }
  };

  return (
    <DashboardLayout title="市場">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">
              TWD 交易對
            </h3>
            {lastUpdated && (
              <p className="text-xs text-neutral-500 mt-1">
                最後更新: {lastUpdated.toLocaleTimeString('zh-TW')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetToDefaultOrder}
              className="text-sm text-neutral-400 hover:text-primary-300"
            >
              重置排序
            </button>
            <button
              onClick={fetchTickers}
              disabled={loading}
              className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-50"
            >
              {loading ? '載入中...' : '重新整理'}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-danger-400">{error}</p>
              <button
                onClick={fetchTickers}
                className="mt-2 text-sm text-primary-400 hover:underline"
              >
                重試
              </button>
            </div>
          ) : loading && tickers.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">載入市場資料中...</p>
            </div>
          ) : orderedTickers.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">未找到交易對</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* 表頭 - 僅桌面版顯示 */}
              <div className="hidden md:flex px-6 py-3 border-b border-neutral-800 items-center justify-between bg-neutral-800/50">
                <div className="flex items-center gap-3 w-28">
                  <span className="text-xs font-medium text-neutral-400 uppercase">
                    交易對
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-xs font-medium text-neutral-400 uppercase text-right w-28">
                    最新價格
                  </span>
                  <span className="text-xs font-medium text-neutral-400 uppercase text-right w-24">
                    24H 漲跌
                  </span>
                  <span className="text-xs font-medium text-neutral-400 uppercase text-right w-24">
                    24H 最高
                  </span>
                  <span className="text-xs font-medium text-neutral-400 uppercase text-right w-24">
                    24H 最低
                  </span>
                  <span className="text-xs font-medium text-neutral-400 uppercase text-right w-28">
                    24H 成交量
                  </span>
                </div>
              </div>

              {/* 交易對列表 */}
              <div className="divide-y divide-neutral-800">
                {orderedTickers.map((ticker) => {
                  const priceChange = parseFloat(ticker.priceChange24hr);
                  const isPositive = priceChange >= 0;
                  const isDragging = draggedItem === ticker.pair;
                  const isDragOver = dragOverItem === ticker.pair;

                  return (
                    <div
                      key={ticker.pair}
                      draggable
                      onDragStart={() => handleDragStart(ticker.pair)}
                      onDragOver={(e) => handleDragOver(e, ticker.pair)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, ticker.pair)}
                      onDragEnd={handleDragEnd}
                      className={`px-4 md:px-6 py-4 transition-all cursor-grab active:cursor-grabbing ${
                        isDragging
                          ? 'opacity-50 bg-neutral-800'
                          : isDragOver
                          ? 'bg-primary-900/30 border-t-2 border-primary-500'
                          : 'hover:bg-neutral-800/50'
                      }`}
                    >
                      {/* 手機版佈局 */}
                      <div className="md:hidden">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-semibold text-neutral-100">
                              {formatPairName(ticker.pair)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-neutral-100 tabular-nums">
                              NT$ {formatPrice(ticker.lastPrice)}
                            </p>
                            <span
                              className={`text-xs font-medium ${
                                isPositive
                                  ? 'text-success-400'
                                  : 'text-danger-400'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {priceChange.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-neutral-500">最高</p>
                            <p className="font-medium tabular-nums text-neutral-200">
                              {formatPrice(ticker.high24hr)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">最低</p>
                            <p className="font-medium tabular-nums text-neutral-200">
                              {formatPrice(ticker.low24hr)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">成交量</p>
                            <p className="font-medium tabular-nums text-neutral-200">
                              {formatVolume(ticker.volume24hr)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 桌面版佈局 */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-3 w-28">
                          <div className="text-neutral-600 cursor-grab">
                            ⋮⋮
                          </div>
                          <p className="text-sm font-semibold text-neutral-100">
                            {formatPairName(ticker.pair)}
                          </p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right w-28">
                            <p className="text-sm font-semibold text-neutral-100 tabular-nums">
                              NT$ {formatPrice(ticker.lastPrice)}
                            </p>
                          </div>
                          <div className="text-right w-24">
                            <span
                              className={`text-sm font-semibold tabular-nums px-2 py-1 rounded ${
                                isPositive
                                  ? 'bg-success-900/30 text-success-400'
                                  : 'bg-danger-900/30 text-danger-400'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {priceChange.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-right w-24">
                            <p className="text-sm font-medium text-neutral-200 tabular-nums">
                              {formatPrice(ticker.high24hr)}
                            </p>
                          </div>
                          <div className="text-right w-24">
                            <p className="text-sm font-medium text-neutral-200 tabular-nums">
                              {formatPrice(ticker.low24hr)}
                            </p>
                          </div>
                          <div className="text-right w-28">
                            <p className="text-sm font-medium text-neutral-200 tabular-nums">
                              {formatVolume(ticker.volume24hr)}{' '}
                              {getBaseCurrency(ticker.pair)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 統計資訊 */}
              <div className="px-4 md:px-6 py-3 bg-neutral-800/50 border-t border-neutral-800">
                <p className="text-xs text-neutral-500">
                  共 {tickers.length} 個 TWD 交易對 · 拖移可自訂排序 · 每 30 秒自動更新
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
