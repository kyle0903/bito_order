import { NextRequest, NextResponse } from 'next/server';
import { LedgerEntryInput } from '@/lib/ledger';
import { entryToProperties, getNotionFromRequest, pageToEntry, queryAllEntries } from '@/lib/notionLedger';

// 強制動態渲染
export const dynamic = 'force-dynamic';

// 更新單筆紀錄（轉帳/兌換由前端兩筆分別更新）
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = getNotionFromRequest(request);
    if ('error' in ctx) return ctx.error;

    const entry: LedgerEntryInput = await request.json();
    await ctx.notion.pages.update({
      page_id: params.id,
      properties: entryToProperties(entry),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update ledger entry:', error);
    return NextResponse.json(
      { error: '更新失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 刪除（封存）紀錄；若屬於轉帳/兌換群組，同群組的紀錄一併封存
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = getNotionFromRequest(request);
    if ('error' in ctx) return ctx.error;

    const page = await ctx.notion.pages.retrieve({ page_id: params.id });
    const entry = 'properties' in page ? pageToEntry(page) : null;

    let pageIds = [params.id];
    if (entry?.groupId) {
      const legs = await queryAllEntries(ctx.notion, ctx.databaseId, {
        property: 'GroupId',
        rich_text: { equals: entry.groupId },
      });
      pageIds = Array.from(new Set([params.id, ...legs.map(l => l.id)]));
    }

    for (const pageId of pageIds) {
      await ctx.notion.pages.update({ page_id: pageId, archived: true });
    }

    return NextResponse.json({ success: true, archived: pageIds.length });
  } catch (error) {
    console.error('Failed to archive ledger entry:', error);
    return NextResponse.json(
      { error: '刪除失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
