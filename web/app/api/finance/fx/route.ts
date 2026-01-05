import { NextResponse } from 'next/server';
import { getUsdTwdRate } from '@/lib/financeService';

// 強制動態渲染
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 從免費 API 取得 USD/TWD 匯率
    const rate = await getUsdTwdRate();

    return NextResponse.json({
      success: true,
      data: {
        pair: 'USD/TWD',
        rate: rate,
        priceChange: 0,
        priceChangePercent: 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch USD/TWD rate:', error);
    // 返回預設匯率而非錯誤
    return NextResponse.json({
      success: true,
      data: {
        pair: 'USD/TWD',
        rate: 32.5, // 預設匯率
        priceChange: 0,
        priceChangePercent: 0,
        fallback: true,
      }
    });
  }
}
