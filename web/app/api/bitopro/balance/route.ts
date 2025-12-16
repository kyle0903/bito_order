import { NextResponse } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

export async function GET() {
  try {
    const apiKey = process.env.BITOPRO_API_KEY;
    const apiSecret = process.env.BITOPRO_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'API credentials not configured' },
        { status: 500 }
      );
    }

    const api = new BitoProAPI({ apiKey, apiSecret });
    const balance = await api.getAccountBalance();

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
