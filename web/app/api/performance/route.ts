import { NextResponse, NextRequest } from 'next/server';
import { getNotionFromRequest, queryAllEntries } from '@/lib/notionLedger';
import { computePerformance } from '@/lib/performance';
import { loadPriceLookup } from '@/lib/priceHistory';

export const dynamic = 'force-dynamic';

// 從帳本重建每日淨值、累計淨投入與 XIRR（整體與各分類）
export async function GET(request: NextRequest) {
  try {
    const ctx = getNotionFromRequest(request);
    if ('error' in ctx) return ctx.error;

    const entries = (await queryAllEntries(ctx.notion, ctx.databaseId)).filter(e => e.date);
    // 以台灣時間的日期為「今天」
    const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    const since = entries.reduce((min, e) => (e.date < min ? e.date : min), today);

    const price = await loadPriceLookup(entries, since);

    return NextResponse.json({ success: true, data: computePerformance(entries, price, today) });
  } catch (error) {
    console.error('Failed to compute performance:', error);
    return NextResponse.json(
      { error: '績效計算失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
