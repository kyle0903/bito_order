import { NextRequest, NextResponse } from 'next/server';
import { getBitfinexFromRequest, monthRange, sumInterest } from '@/lib/bitfinex';

export const dynamic = 'force-dynamic';

// 各月份（台灣時間）的放貸利息總和：?months=2026-12,2027-01
export async function GET(request: NextRequest) {
  const creds = getBitfinexFromRequest(request);
  if ('error' in creds) return creds.error;

  const months = (request.nextUrl.searchParams.get('months') || '')
    .split(',')
    .filter(m => /^\d{4}-\d{2}$/.test(m));

  try {
    const data: { month: string; interest: number }[] = [];
    for (const month of months) {
      const { start, end } = monthRange(month);
      data.push({ month, interest: await sumInterest(creds, 'USD', start, end) });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch Bitfinex interest:', error);
    return NextResponse.json(
      { error: '讀取 Bitfinex 利息失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
