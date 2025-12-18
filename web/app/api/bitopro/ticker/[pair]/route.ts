import { NextResponse } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

// 禁用 Next.js 的快取，確保每次都獲取最新數據
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { pair: string } }
) {
  try {
    const ticker = await BitoProAPI.getTicker(params.pair);
    
    // 返回時加上 no-cache 標頭
    return NextResponse.json(ticker, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to fetch ticker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticker' },
      { status: 400 }
    );
  }
}
