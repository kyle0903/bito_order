import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// 強制動態渲染
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();

    // 同時取得股票報價和 USD/TWD 匯率
    const [stockQuote, fxQuote] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quote('USDTWD=X'), // USD/TWD 匯率
    ]);

    // 檢查是否有有效的價格資料
    const usdPrice = (stockQuote as any)?.regularMarketPrice;
    if (!stockQuote || !usdPrice) {
      return NextResponse.json(
        { error: `無法取得 ${symbol} 的價格` },
        { status: 404 }
      );
    }

    const stockData = stockQuote as any;
    const usdToTwd = (fxQuote as any)?.regularMarketPrice || 32; // 預設匯率
    const twdPrice = usdPrice * usdToTwd;

    return NextResponse.json({
      success: true,
      data: {
        symbol: stockData.symbol,
        priceUSD: usdPrice,
        priceTWD: twdPrice,
        currency: stockData.currency,
        usdToTwdRate: usdToTwd,
        priceChange: stockData.regularMarketChange || 0,
        priceChangePercent: stockData.regularMarketChangePercent || 0,
        previousClose: stockData.regularMarketPreviousClose,
        marketState: stockData.marketState,
      },
    });
  } catch (error) {
    console.error('Failed to fetch Yahoo Finance data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch stock price',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

