import { NextResponse, NextRequest } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

// 強制動態渲染，避免 Vercel 靜態渲染錯誤
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 從 headers 讀取憑證
    const apiKey = request.headers.get('X-API-Key');
    const apiSecret = request.headers.get('X-API-Secret');
    const email = request.headers.get('X-API-Email');

    if (!apiKey || !apiSecret || !email) {
      return NextResponse.json(
        { error: 'API credentials not configured' },
        { status: 401 }
      );
    }

    // 從 query parameters 讀取幣種
    const searchParams = request.nextUrl.searchParams;
    const pairsParam = searchParams.get('pairs');

    // 解析幣種
    const pairs = pairsParam
      ? pairsParam.split(',').map(p => p.trim().toLowerCase())
      : ['btc_twd', 'eth_twd', 'ada_twd']; // 預設幣種

    const api = new BitoProAPI({ apiKey, apiSecret, email });
    const allOrders: any[] = [];

    for (const pair of pairs) {
      try {
        const result = await api.getAllOrders(pair, 'ALL', 1000);
        if (result.data && Array.isArray(result.data)) {
          allOrders.push(...result.data);
        }
      } catch (e) {
        // 忽略錯誤，繼續下一個幣種
      }
    }

    // 去除重複訂單（根據 id）
    const uniqueOrders = allOrders.filter((order, index, self) =>
      index === self.findIndex(o => o.id === order.id)
    );

    // 按時間排序（最新的在前）
    uniqueOrders.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));

    return NextResponse.json({ data: uniqueOrders });
  } catch (error) {
    console.error('Failed to fetch order history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order history' },
      { status: 400 }
    );
  }
}




