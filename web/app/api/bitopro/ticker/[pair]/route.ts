import { NextResponse } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

export async function GET(
  request: Request,
  { params }: { params: { pair: string } }
) {
  try {
    const ticker = await BitoProAPI.getTicker(params.pair);
    return NextResponse.json(ticker);
  } catch (error) {
    console.error('Failed to fetch ticker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticker' },
      { status: 400 }
    );
  }
}