import { NextResponse } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

export async function GET() {
  try {
    const apiKey = process.env.BITOPRO_API_KEY;
    const apiSecret = process.env.BITOPRO_API_SECRET;
    const email = process.env.BITOPRO_EMAIL;

    if (!apiKey || !apiSecret || !email) {
      return NextResponse.json(
        { error: 'API credentials not configured (need API_KEY, API_SECRET, and EMAIL)' },
        { status: 500 }
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
      { status: 500 }
    );
  }
}

