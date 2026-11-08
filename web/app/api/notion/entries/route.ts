import { NextRequest, NextResponse } from 'next/server';
import { LedgerEntryInput } from '@/lib/ledger';
import { entryToProperties, getNotionFromRequest, queryAllEntries } from '@/lib/notionLedger';

// 強制動態渲染
export const dynamic = 'force-dynamic';

// 取得全部記帳紀錄（新到舊）
export async function GET(request: NextRequest) {
  try {
    const ctx = getNotionFromRequest(request);
    if ('error' in ctx) return ctx.error;

    const entries = await queryAllEntries(ctx.notion, ctx.databaseId);
    entries.sort((a, b) =>
      a.date !== b.date ? (a.date < b.date ? 1 : -1) : (a.createdTime < b.createdTime ? 1 : -1)
    );

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error('Failed to fetch ledger entries:', error);
    return NextResponse.json(
      { error: '讀取記帳紀錄失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 批次新增紀錄；帶 orderId 且已存在的紀錄會被跳過（防重複匯出）
export async function POST(request: NextRequest) {
  try {
    const ctx = getNotionFromRequest(request);
    if ('error' in ctx) return ctx.error;

    const body = await request.json();
    const entries: LedgerEntryInput[] = body.entries;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: '請提供紀錄資料' }, { status: 400 });
    }

    let toCreate = entries;
    if (entries.some(e => e.orderId)) {
      const existing = await queryAllEntries(ctx.notion, ctx.databaseId);
      const exportedIds = new Set(existing.map(e => e.orderId).filter(Boolean));
      toCreate = entries.filter(e => !e.orderId || !exportedIds.has(e.orderId));
    }
    const skipped = entries.length - toCreate.length;

    // 依序建立，維持建立時間順序（同日排序依此）
    let successful = 0;
    let failed = 0;
    for (const entry of toCreate) {
      try {
        await ctx.notion.pages.create({
          parent: { database_id: ctx.databaseId },
          properties: entryToProperties(entry),
        });
        successful++;
      } catch (err) {
        console.error('Failed to create ledger entry:', err);
        failed++;
      }
    }

    const parts = [`成功新增 ${successful} 筆紀錄`];
    if (skipped > 0) parts.push(`${skipped} 筆已匯出過而略過`);
    if (failed > 0) parts.push(`${failed} 筆失敗`);

    return NextResponse.json({
      success: failed === 0,
      message: parts.join('，'),
      results: { successful, failed, skipped, total: entries.length },
    }, { status: failed > 0 && successful === 0 ? 500 : 200 });
  } catch (error) {
    console.error('Failed to add ledger entries:', error);
    return NextResponse.json(
      { error: '新增失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
