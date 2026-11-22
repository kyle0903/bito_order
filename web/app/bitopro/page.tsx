'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import MarketPanel from '@/components/MarketPanel';
import TradingPanel from '@/components/TradingPanel';

const TABS = [
  { key: 'market', label: '行情' },
  { key: 'trading', label: '交易' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function BitoProPage() {
  const [tab, setTab] = useState<TabKey>('market');

  return (
    <DashboardLayout title="BitoPro">
      <div className="mb-6 inline-flex rounded-full bg-neutral-900 p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white/[0.12] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'market' ? <MarketPanel /> : <TradingPanel />}
    </DashboardLayout>
  );
}
