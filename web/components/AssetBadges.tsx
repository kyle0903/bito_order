'use client';

import { useState } from 'react';

// 平台標籤顏色
const PLATFORM_COLORS: Record<string, string> = {
  BitoPro: '#3B82F6',
  Bitfinex: '#16B157',
  'Ether.fi': '#8B5CF6',
  券商: '#F59E0B',
};

export function PlatformBadge({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] || '#A3A3A3';
  return (
    <span
      className="text-xs font-medium px-1.5 py-0.5 rounded"
      style={{ backgroundColor: `${color}26`, color }}
    >
      {platform}
    </span>
  );
}

// 圖示來源：股票用 FMP 公司 logo，其他（加密貨幣、USD）用 spothq 圖示庫
function getIconUrl(symbol: string, platform: string): string {
  if (platform === '券商') {
    return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol.toUpperCase())}.png`;
  }
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${symbol.toLowerCase()}.svg`;
}

/** 資產圖示；找不到圖片時顯示代號前兩字 */
export function AssetIcon({ symbol, platform, dimmed = false }: { symbol: string; platform: string; dimmed?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${dimmed ? 'bg-neutral-800' : 'bg-primary-900/50'}`}>
        <span className={`text-sm font-semibold ${dimmed ? 'text-neutral-500' : 'text-primary-400'}`}>
          {symbol.substring(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-white/90 flex items-center justify-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- 外部 logo，失敗時退回文字 */}
      <img
        src={getIconUrl(symbol, platform)}
        alt={symbol}
        className={`w-full h-full object-contain ${dimmed ? 'opacity-50' : ''}`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
