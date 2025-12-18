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

  const connect = useCallback(() => {
    if (!pair) return;

    // 清理之前的連線
    if (wsRef.current) {
      wsRef.current.close();
    }

    const pairLower = pair.toLowerCase();
    const wsUrl = `${WEBSOCKET_URL}/${pairLower}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
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
      
      // 自動重連（5秒後）
      if (pair) {
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
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { data, isConnected, error };
}
