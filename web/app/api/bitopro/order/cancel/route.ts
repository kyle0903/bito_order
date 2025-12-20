import { NextRequest, NextResponse } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

// 強制動態渲染，避免 Vercel 靜態渲染錯誤
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key');
    const apiSecret = request.headers.get('X-API-Secret');
    const email = request.headers.get('X-API-Email');

    if (!apiKey || !apiSecret || !email) {
      return NextResponse.json(
        { error: 'API credentials not configured' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pair, orderId } = body;

    if (!pair || !orderId) {
      return NextResponse.json(
        { error: 'Missing required parameters: pair and orderId' },
        { status: 400 }
      );
    }

    const api = new BitoProAPI({ apiKey, apiSecret, email });
    const result = await api.cancelOrder(pair, orderId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to cancel order:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
