import { NextResponse } from 'next/server';
import { getStockQuote, getUsdTwdRate } from '@/lib/financeService';

// 強制動態渲染
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();

    // 使用 financeService 取得股票報價
    const stockQuote = await getStockQuote(symbol);
    
    // 取得 USD/TWD 匯率
    const usdToTwd = await getUsdTwdRate();

    // 檢查是否有有效的價格資料
    if (!stockQuote || !stockQuote.price) {
      return NextResponse.json({
        success: false,
        error: `無法取得 ${symbol} 的價格`,
        data: {
          symbol,
          priceUSD: 0,
          priceTWD: 0,
          currency: 'USD',
          usdToTwdRate: usdToTwd,
          priceChange: 0,
          priceChangePercent: 0,
          unavailable: true,
        }
      });
    }

    const quoteCurrency = (stockQuote.currency || 'USD').toUpperCase();
    const isTwdQuote = quoteCurrency === 'TWD';
    const twdPrice = isTwdQuote ? stockQuote.price : stockQuote.price * usdToTwd;
    const usdPrice = isTwdQuote && usdToTwd > 0
      ? stockQuote.price / usdToTwd
      : stockQuote.price;

    return NextResponse.json({
      success: true,
      data: {
        symbol: stockQuote.symbol,
        priceUSD: usdPrice,
        priceTWD: twdPrice,
        currency: quoteCurrency,
        usdToTwdRate: usdToTwd,
        priceChange: stockQuote.change,
        priceChangePercent: stockQuote.changePercent,
        source: stockQuote.source,
      },
    });
  } catch (error) {
    console.error('Failed to fetch stock data:', error);
    
    const symbol = params.symbol.toUpperCase();
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stock price',
      data: {
        symbol,
        priceUSD: 0,
        priceTWD: 0,
        currency: 'USD',
        usdToTwdRate: 32.5,
        priceChange: 0,
        priceChangePercent: 0,
        unavailable: true,
      }
    });
  }
}
