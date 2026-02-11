import { NextResponse } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await BitoProAPI.getTradingPairs();
    
    // 過濾出 TWD 交易對
    const twdPairs = (data.data || []).filter(
      (ticker: { pair: string }) => ticker.pair.endsWith('_twd')
    );
    
    return NextResponse.json(
      {
        success: true,
        data: twdPairs,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch tickers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickers' },
      { status: 500 }
    );
  }
}
