import { NextRequest, NextResponse } from 'next/server';
import { getBitfinexFromRequest, getLendingSummary } from '@/lib/bitfinex';

export const dynamic = 'force-dynamic';

// 放貸現況：錢包餘額、已借出、掛單中、閒置與本月至今利息
export async function GET(request: NextRequest) {
  const creds = getBitfinexFromRequest(request);
  if ('error' in creds) return creds.error;

  try {
    return NextResponse.json({ success: true, data: await getLendingSummary(creds) });
  } catch (error) {
    console.error('Failed to fetch Bitfinex summary:', error);
    return NextResponse.json(
      { error: '讀取 Bitfinex 失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
