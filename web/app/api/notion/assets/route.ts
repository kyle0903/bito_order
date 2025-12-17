import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

// 初始化 Notion 客戶端
const notion = new Client({
  auth: process.env.NOTION_API_TOKEN,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID || '';

interface AssetSummary {
  target: string;
  totalQuantity: number;
  totalAmount: number;
}

// 從 Notion page 中提取屬性值
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

export async function GET() {
  try {
    if (!process.env.NOTION_API_TOKEN) {
      return NextResponse.json(
        { error: 'Notion API Token 未設定' },
        { status: 500 }
      );
    }

    if (!DATABASE_ID) {
      return NextResponse.json(
        { error: 'Notion Database ID 未設定' },
        { status: 500 }
      );
    }

    // 查詢 Notion Database 中的所有資料
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
    });

    // 彙總資料：按 Target 分組
    const summaryMap = new Map<string, AssetSummary>();

    for (const page of response.results) {
      if (!('properties' in page)) continue;

      const properties = page.properties;
      const target = getPropertyValue(properties.Target) as string;
      const quantity = getPropertyValue(properties.Quantity) as number || 0;
      const amount = getPropertyValue(properties.Amount) as number || 0;

      if (!target) continue;

      if (summaryMap.has(target)) {
        const existing = summaryMap.get(target)!;
        existing.totalQuantity += quantity;
        existing.totalAmount += amount;
      } else {
        summaryMap.set(target, {
          target,
          totalQuantity: quantity,
          totalAmount: amount,
        });
      }
    }

    // 轉換為陣列
    const assets: AssetSummary[] = Array.from(summaryMap.values());

    return NextResponse.json({
      success: true,
      data: assets,
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
