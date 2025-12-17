import { NextResponse, NextRequest } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

export async function GET(request: NextRequest) {
  try {
    // 優先從 headers 讀取憑證
    const apiKey = request.headers.get('X-API-Key');
    const apiSecret = request.headers.get('X-API-Secret');
    const email = request.headers.get('X-API-Email');

    if (!apiKey || !apiSecret || !email) {
      return NextResponse.json(
        { error: 'API credentials not configured. Please set up your credentials in Settings.' },
        { status: 401 }
      );
    }

    const api = new BitoProAPI({ apiKey, apiSecret, email });
    const balance = await api.getAccountBalance();

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });

    return NextResponse.json(
      {
        error: 'Failed to fetch balance',
        details: errorMessage,
        type: error?.constructor?.name
      },
      { status: 400 }
    );
  }
}


