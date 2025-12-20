'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface OrderBookData {
  pair: string;
  bestBid: number;
  bestAsk: number;
  lastPrice: number;
}

const WEBSOCKET_URL = 'wss://stream.bitopro.com:443/ws/v1/pub/order-books';

export function useBitoProWebSocket(pair: string) {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 追蹤當前期望的 pair，用於驗證收到的數據
  const currentPairRef = useRef<string>(pair);

  // 當 pair 改變時，立即更新 ref 並清空舊數據
  useEffect(() => {
    currentPairRef.current = pair;
    // 清空舊數據，避免顯示過期的價格
    setData(null);
    setIsConnected(false);
  }, [pair]);

  const connect = useCallback(() => {
    if (!pair) return;

    // 清理之前的連線
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // 清理重連 timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const pairLower = pair.toLowerCase();
    const wsUrl = `${WEBSOCKET_URL}/${pairLower}`;

    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // 確認這個連線仍然是當前需要的 pair
      if (currentPairRef.current.toLowerCase() !== pairLower) {
        console.log('WebSocket connected but pair changed, closing...');
        ws.close();
        return;
      }
      console.log('WebSocket connected for', pairLower);
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      // 驗證收到的數據是否屬於當前選擇的 pair
      if (currentPairRef.current.toLowerCase() !== pairLower) {
        console.log('Ignoring stale WebSocket data for', pairLower);
        return;
      }

      try {
        const message = JSON.parse(event.data);

        if (message.event === 'ORDER_BOOK') {
          const bids = message.bids || [];
          const asks = message.asks || [];

          const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
          const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 0;
          const midPrice = (bestBid + bestAsk) / 2;

          setData({
            pair: pairLower,
            bestBid,
            bestAsk,
            lastPrice: midPrice,
          });
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection error');
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setIsConnected(false);

      // 只有當這個 pair 仍然是當前選擇的 pair 時才自動重連
      if (pair && currentPairRef.current.toLowerCase() === pairLower) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 5000);
      }
    };

    wsRef.current = ws;
  }, [pair]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return { data, isConnected, error };
}

