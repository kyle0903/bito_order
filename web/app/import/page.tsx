'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BitoProImportPanel from '@/components/BitoProImportPanel';
import BitfinexInterestPanel from '@/components/BitfinexInterestPanel';

const TABS = [
  { key: 'bitopro', label: 'BitoPro 訂單' },
  { key: 'bitfinex', label: 'Bitfinex 利息' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function ImportPage() {
  const [tab, setTab] = useState<TabKey>('bitopro');

  return (
    <DashboardLayout title="匯入">
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
      {tab === 'bitopro' ? <BitoProImportPanel /> : <BitfinexInterestPanel />}
    </DashboardLayout>
  );
}
