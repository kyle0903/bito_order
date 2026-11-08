import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { LedgerEntry, LedgerEntryInput, Platform, EntryType } from '@/lib/ledger';

/** 從 request headers 建立 Notion client；未設定時回傳錯誤 Response */
export function getNotionFromRequest(
  request: NextRequest
): { notion: Client; databaseId: string } | { error: NextResponse } {
  const apiToken = request.headers.get('X-Notion-Token');
  const databaseId = request.headers.get('X-Notion-Database-Id');

  if (!apiToken) {
    return { error: NextResponse.json({ error: 'Notion API Token 未設定', notConfigured: true }, { status: 401 }) };
  }
  if (!databaseId) {
    return { error: NextResponse.json({ error: 'Notion Database ID 未設定', notConfigured: true }, { status: 401 }) };
  }

  return { notion: new Client({ auth: apiToken }), databaseId };
}

function getPropertyValue(property: any): string | number | null {
  if (!property) return null;

  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || '';
    case 'number':
      return property.number;
    case 'select':
      return property.select?.name || '';
    case 'date':
      return property.date?.start || '';
    default:
      return null;
  }
}

/** 舊資料沒有 Type 時依正負號推斷 */
function inferType(quantity: number, amount: number): EntryType {
  if (quantity < 0) return '賣出';
  if (amount === 0) return '利息';
  return '買入';
}

export function pageToEntry(page: any): LedgerEntry | null {
  const properties = page.properties;
  const target = (getPropertyValue(properties.Target) as string) || '';
  if (!target) return null;

  const quantity = (getPropertyValue(properties.Quantity) as number) || 0;
  const amount = (getPropertyValue(properties.Amount) as number) || 0;

  return {
    id: page.id,
    createdTime: page.created_time,
    target: target.toUpperCase(),
    date: (getPropertyValue(properties.Date) as string) || '',
    quantity,
    amount,
    platform: ((getPropertyValue(properties.Platform) as string) || 'BitoPro') as Platform,
    type: ((getPropertyValue(properties.Type) as string) || inferType(quantity, amount)) as EntryType,
    groupId: (getPropertyValue(properties.GroupId) as string) || undefined,
    orderId: (getPropertyValue(properties.OrderId) as string) || undefined,
  };
}

export function entryToProperties(entry: LedgerEntryInput): Record<string, any> {
  const text = (value?: string) => ({ rich_text: value ? [{ text: { content: value } }] : [] });

  return {
    Target: { select: { name: entry.target.toUpperCase() } },
    Date: { date: { start: entry.date } },
    Quantity: { number: entry.quantity },
    Amount: { number: entry.amount },
    Platform: { select: { name: entry.platform } },
    Type: { select: { name: entry.type } },
    GroupId: text(entry.groupId),
    OrderId: text(entry.orderId),
  };
}

/** 讀取 Database 全部紀錄（處理分頁，Notion 單次最多 100 筆） */
export async function queryAllEntries(notion: Client, databaseId: string, filter?: any): Promise<LedgerEntry[]> {
  const entries: LedgerEntry[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response: any = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      ...(filter ? { filter } : {}),
    });

    for (const page of response.results) {
      if (!('properties' in page)) continue;
      const entry = pageToEntry(page);
      if (entry) entries.push(entry);
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return entries;
}
