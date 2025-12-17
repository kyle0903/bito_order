import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET() {
  try {
    // 從 Yahoo Finance 取得 USD/TWD 匯率
    const quote = await yahooFinance.quote('USDTWD=X');
    
    const rate = (quote as any)?.regularMarketPrice;
    if (!quote || !rate) {
      return NextResponse.json(
        { error: '無法取得 USD/TWD 匯率' },
        { status: 404 }
      );
    }

    const quoteData = quote as any;
    
    return NextResponse.json({
      success: true,
      data: {
        pair: 'USD/TWD',
        rate: rate,
        priceChange: quoteData.regularMarketChange || 0,
        priceChangePercent: quoteData.regularMarketChangePercent || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch USD/TWD rate:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchange rate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
