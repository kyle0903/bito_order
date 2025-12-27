import { NextResponse } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

export async function GET() {
  try {
    const data = await BitoProAPI.getTradingPairs();
    
    // 過濾出 TWD 交易對
    const twdPairs = (data.data || []).filter(
      (ticker: { pair: string }) => ticker.pair.endsWith('_twd')
    );
    
    return NextResponse.json({
      success: true,
      data: twdPairs,
    });
  } catch (error) {
    console.error('Failed to fetch tickers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickers' },
      { status: 500 }
    );
  }
}
