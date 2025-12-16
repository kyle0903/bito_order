import { NextResponse } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

export async function GET(
  request: Request,
  { params }: { params: { pair: string } }
) {
  try {
    const apiKey = process.env.BITOPRO_API_KEY || '';
    const apiSecret = process.env.BITOPRO_API_SECRET || '';

    const api = new BitoProAPI({ apiKey, apiSecret });
    const ticker = await api.getTicker(params.pair);

    return NextResponse.json(ticker);
  } catch (error) {
    console.error('Failed to fetch ticker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticker' },
      { status: 500 }
    );
  }
}
