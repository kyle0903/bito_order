import { NextResponse } from 'next/server';

interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update: string;
}

interface FearGreedResponse {
  name: string;
  data: FearGreedData[];
  metadata: {
    error: string | null;
  };
}

export async function GET() {
  try {
    // 從 Alternative.me API 取得恐懼貪婪指數
    const response = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 3600 }, // 快取 1 小時
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Fear & Greed Index');
    }

    const data: FearGreedResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No data available');
    }

    const latestData = data.data[0];
    const value = parseInt(latestData.value);
    
    // 根據數值決定顏色
    let color = '#6B7280'; // neutral
    if (value <= 25) {
      color = '#EF4444'; // 極度恐懼 - 紅色
    } else if (value <= 45) {
      color = '#F97316'; // 恐懼 - 橙色
    } else if (value <= 55) {
      color = '#EAB308'; // 中性 - 黃色
    } else if (value <= 75) {
      color = '#84CC16'; // 貪婪 - 淺綠色
    } else {
      color = '#22C55E'; // 極度貪婪 - 綠色
    }

    // 翻譯分類為中文
    const classificationMap: { [key: string]: string } = {
      'Extreme Fear': '極度恐懼',
      'Fear': '恐懼',
      'Neutral': '中性',
      'Greed': '貪婪',
      'Extreme Greed': '極度貪婪',
    };

    return NextResponse.json({
      success: true,
      data: {
        value: value,
        classification: classificationMap[latestData.value_classification] || latestData.value_classification,
        classificationEn: latestData.value_classification,
        color: color,
        timestamp: latestData.timestamp,
      },
    });
  } catch (error) {
    console.error('Failed to fetch Fear & Greed Index:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Fear & Greed Index',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
