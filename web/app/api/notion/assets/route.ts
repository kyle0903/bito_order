import { NextResponse, NextRequest } from 'next/server';
import { computePositions } from '@/lib/ledger';
import { getNotionFromRequest, queryAllEntries } from '@/lib/notionLedger';

// 強制動態渲染
export const dynamic = 'force-dynamic';

// 回傳每個「代號 + 平台」的持倉（平均成本法），含已結清部位的已實現損益
export async function GET(request: NextRequest) {
  try {
    const ctx = getNotionFromRequest(request);
    if ('error' in ctx) return ctx.error;

    const entries = await queryAllEntries(ctx.notion, ctx.databaseId);

    return NextResponse.json({
      success: true,
      data: computePositions(entries),
    });
  } catch (error) {
    console.error('Failed to fetch Notion assets:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch assets from Notion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
