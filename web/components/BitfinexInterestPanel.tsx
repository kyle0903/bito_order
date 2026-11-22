'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card, { CardHeader, CardContent } from './Card';
import Button from './Button';
import { useBitfinexCredentials } from '@/hooks/useBitfinexCredentials';
import { useNotionCredentials } from '@/hooks/useNotionCredentials';
import { fetchWithBitfinexCredentials, fetchWithNotionCredentials } from '@/lib/api';
import type { LedgerEntry, LedgerEntryInput } from '@/lib/ledger';

/** 自動同步的起算月：之前的月份保留手動紀錄 */
const SYNC_START_MONTH = '2026-12';
const ORDER_ID_PREFIX = 'BFX-INT-';

interface MonthRow {
  month: string;
  interest: number | null; // 已同步：帳本數量；未同步：API 加總
  synced: boolean;
}

/** 起算月到上個月（台灣時間）的所有已結束月份 */
function completedMonths(): string[] {
  const current = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 7);
  const months: string[] = [];
  let [y, m] = SYNC_START_MONTH.split('-').map(Number);
  for (let month = SYNC_START_MONTH; month < current; month = `${y}-${String(m).padStart(2, '0')}`) {
    months.push(month);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

const lastDayOfMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/** 匯入頁的 Bitfinex 利息同步：每個已結束月份寫入一筆「利息」 */
export default function BitfinexInterestPanel() {
  const { credentials: bfx, isConfigured: isBfxConfigured, isLoading: isBfxLoading } = useBitfinexCredentials();
  const { credentials: notion, isConfigured: isNotionConfigured, isLoading: isNotionLoading } = useNotionCredentials();
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  const months = completedMonths();

  const load = useCallback(async () => {
    if (!isBfxConfigured || !isNotionConfigured) {
      setLoading(false);
      return;
    }
    const allMonths = completedMonths();
    if (allMonths.length === 0) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const entriesRes = await fetchWithNotionCredentials('/api/notion/entries', notion);
      const entriesJson = await entriesRes.json();
      if (!entriesRes.ok) throw new Error(entriesJson.error || '讀取帳本失敗');
      const synced = new Map<string, number>();
      for (const e of (entriesJson.data || []) as LedgerEntry[]) {
        if (e.orderId?.startsWith(ORDER_ID_PREFIX)) synced.set(e.orderId.slice(ORDER_ID_PREFIX.length), e.quantity);
      }

      const pending = allMonths.filter(m => !synced.has(m));
      const fetched = new Map<string, number>();
      if (pending.length > 0) {
        const res = await fetchWithBitfinexCredentials(`/api/bitfinex/interest?months=${pending.join(',')}`, bfx);
        const json = await res.json();
        if (!res.ok) throw new Error(json.details || json.error || '讀取 Bitfinex 利息失敗');
        for (const row of json.data as { month: string; interest: number }[]) fetched.set(row.month, row.interest);
      }

      setRows(allMonths.map(month => ({
        month,
        synced: synced.has(month),
        interest: synced.has(month) ? synced.get(month)! : fetched.get(month) ?? null,
      })).reverse());
    } catch (err) {
      setMessage({ success: false, text: err instanceof Error ? err.message : '讀取失敗' });
    } finally {
      setLoading(false);
    }
  }, [bfx, notion, isBfxConfigured, isNotionConfigured]);

  useEffect(() => {
    if (!isBfxLoading && !isNotionLoading) load();
  }, [isBfxLoading, isNotionLoading, load]);

  const toSync = rows.filter(r => !r.synced && (r.interest || 0) > 0);

  const handleSync = async () => {
    const entries: LedgerEntryInput[] = toSync.map(r => ({
      type: '利息',
      date: lastDayOfMonth(r.month),
      platform: 'Bitfinex',
      target: 'USD',
      quantity: r.interest!,
      amount: 0,
      orderId: `${ORDER_ID_PREFIX}${r.month}`,
    }));
    setSyncing(true);
    try {
      const response = await fetchWithNotionCredentials('/api/notion/entries', notion, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.error || '寫入失敗');
      await load();
      setMessage({ success: true, text: data.message });
    } catch (err) {
      setMessage({ success: false, text: err instanceof Error ? err.message : '寫入失敗' });
    } finally {
      setSyncing(false);
    }
  };

  if (!isBfxLoading && !isNotionLoading && (!isBfxConfigured || !isNotionConfigured)) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-neutral-400">需要同時設定 Bitfinex 與 Notion 連線</p>
          <Link href="/settings" className="mt-2 inline-block text-sm text-primary-400 hover:underline">前往設定</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-100">Bitfinex 月利息</h3>
          <p className="text-xs text-neutral-500 mt-1">
            每個已結束的月份（台灣時間）彙總為一筆「利息」，記在該月最後一天；{SYNC_START_MONTH} 之前的月份請沿用手動紀錄
          </p>
        </div>
        <Button onClick={handleSync} disabled={loading || syncing || toSync.length === 0}>
          {syncing ? '寫入中...' : `寫入 ${toSync.length} 筆`}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {message && (
          <p className={`px-6 py-3 text-sm ${message.success ? 'text-success-400' : 'text-danger-400'}`}>{message.text}</p>
        )}
        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-neutral-400">載入中...</p>
        ) : months.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-neutral-400">
            {SYNC_START_MONTH} 結束後才會出現第一個可同步的月份
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-800">
              <tr className="text-xs font-semibold text-neutral-100">
                <th className="px-6 py-3 text-left">月份</th>
                <th className="px-4 py-3 text-right">利息 (USD)</th>
                <th className="px-6 py-3 text-right">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map(row => (
                <tr key={row.month}>
                  <td className="px-6 py-3 tabular-nums text-neutral-100">{row.month}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-100">
                    {row.interest === null ? '--' : row.interest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {row.synced
                      ? <span className="text-neutral-500">已同步</span>
                      : <span className="text-primary-400">待寫入</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
