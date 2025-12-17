import { NextResponse } from 'next/server';
import BitoProAPI from '@/lib/bitopro';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('X-API-Key');
    const apiSecret = request.headers.get('X-API-Secret');
    const email = request.headers.get('X-API-Email');

    if (!apiKey || !apiSecret || !email) {
      return NextResponse.json(
        { error: 'API credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { pair, action, amount, price, type } = body;

    if (!pair || !action || !amount || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const api = new BitoProAPI({ apiKey, apiSecret, email });
    const order = await api.createOrder({
      pair,
      action,
      amount,
      price,
      type,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Failed to create order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
