import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

// 強制動態渲染
export const dynamic = 'force-dynamic';

// 初始化 Notion 客戶端
const notion = new Client({
  auth: process.env.NOTION_API_TOKEN,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID || '';

interface OrderInput {
  target: string;      // 幣種 (BTC, ETH 等)
  date: string;        // 日期 YYYY-MM-DD
  quantity: number;    // 數量
  amount: number;      // 金額 (賣出為負數)
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const orders: OrderInput[] = body.orders;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: '請提供訂單資料' },
        { status: 400 }
      );
    }

    // 批次建立 Notion 頁面
    const results = await Promise.allSettled(
      orders.map(async (order) => {
        const page = await notion.pages.create({
          parent: { database_id: DATABASE_ID },
          properties: {
            Target: {
              select: {
                name: order.target.toUpperCase(),
              },
            },
            Date: {
              date: {
                start: order.date,
              },
            },
            Quantity: {
              number: order.quantity,
            },
            Amount: {
              number: order.amount,
            },
          },
        });
        return { success: true, pageId: page.id, target: order.target };
      })
    );

    // 統計成功和失敗數量
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `成功新增 ${successful} 筆紀錄${failed > 0 ? `，${failed} 筆失敗` : ''}`,
      results: {
        successful,
        failed,
        total: orders.length,
      },
    });
  } catch (error) {
    console.error('Failed to add assets to Notion:', error);
    return NextResponse.json(
      {
        error: '新增失敗',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
