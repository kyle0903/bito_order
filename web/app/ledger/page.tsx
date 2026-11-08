'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Button from '@/components/Button';
import { useNotionCredentials } from '@/hooks/useNotionCredentials';
import { fetchWithNotionCredentials } from '@/lib/api';
import {
  ENTRY_TYPES, EntryType, GROUPED_TYPES, LedgerEntry, LedgerEntryInput, PLATFORMS, Platform,
} from '@/lib/ledger';
import Link from 'next/link';

interface FormState {
  type: EntryType;
  date: string;
  // 買入 / 賣出 / 利息
  platform: Platform;
  target: string;
  quantity: string;
  amount: string;
  // 轉帳 / 兌換
  fromPlatform: Platform;
  fromTarget: string;
  fromQty: string;
  toPlatform: Platform;
  toTarget: string;
  toQty: string;
}

// 列表中的一列：單筆紀錄，或轉帳/兌換的兩筆
interface Row {
  key: string;
  legs: LedgerEntry[];
}

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = (): FormState => ({
  type: '買入',
  date: today(),
  platform: 'BitoPro',
  target: '',
  quantity: '',
  amount: '',
  fromPlatform: 'BitoPro',
  fromTarget: 'USDT',
  fromQty: '',
  toPlatform: 'Bitfinex',
  toTarget: 'USD',
  toQty: '',
});

const isGrouped = (type: EntryType) => GROUPED_TYPES.includes(type);

const newGroupId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 8 });

export default function LedgerPage() {
  const { credentials, isConfigured, isLoading: isCredLoading } = useNotionCredentials();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterTarget, setFilterTarget] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const fetchEntries = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithNotionCredentials('/api/notion/entries', credentials);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '讀取失敗');
      setEntries(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [credentials, isConfigured]);

  useEffect(() => {
    if (!isCredLoading) fetchEntries();
  }, [isCredLoading, fetchEntries]);

  // 把同 GroupId 的紀錄合併成一列
  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    const groups = new Map<string, Row>();
    for (const entry of entries) {
      if (entry.groupId && isGrouped(entry.type)) {
        const existing = groups.get(entry.groupId);
        if (existing) {
          existing.legs.push(entry);
          continue;
        }
        const row = { key: entry.groupId, legs: [entry] };
        groups.set(entry.groupId, row);
        result.push(row);
      } else {
        result.push({ key: entry.id, legs: [entry] });
      }
    }
    // 轉出在前
    result.forEach(r => r.legs.sort((a, b) => a.quantity - b.quantity));
    return result;
  }, [entries]);

  const targetOptions = useMemo(
    () => Array.from(new Set(entries.map(e => e.target))).sort(),
    [entries]
  );

  const filteredRows = rows.filter(row =>
    (filterPlatform === 'all' || row.legs.some(l => l.platform === filterPlatform)) &&
    (filterTarget === 'all' || row.legs.some(l => l.target === filterTarget)) &&
    (filterType === 'all' || row.legs[0].type === filterType)
  );

  const updateForm = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));

  // 表單 → 要寫入的紀錄
  const buildEntries = (): LedgerEntryInput[] | string => {
    const { type, date } = form;
    if (!date) return '請選擇日期';

    if (!isGrouped(type)) {
      const target = form.target.trim().toUpperCase();
      const quantity = parseFloat(form.quantity);
      const noAmount = type === '利息' || type === '調整';
      const amount = noAmount ? 0 : parseFloat(form.amount);
      if (!target) return '請輸入代號';
      if (type === '調整') {
        if (!quantity) return '調整數量不可為 0（減少請輸入負數）';
        return [{ type, date, platform: form.platform, target, quantity, amount: 0 }];
      }
      if (!(quantity > 0)) return '數量須大於 0';
      if (!noAmount && !(amount > 0)) return '金額須大於 0';
      const sign = type === '賣出' ? -1 : 1;
      return [{ type, date, platform: form.platform, target, quantity: sign * quantity, amount: sign * amount }];
    }

    const fromTarget = form.fromTarget.trim().toUpperCase();
    const toTarget = type === '轉帳' ? fromTarget : form.toTarget.trim().toUpperCase();
    const toPlatform = type === '兌換' ? form.fromPlatform : form.toPlatform;
    const fromQty = parseFloat(form.fromQty);
    const toQty = parseFloat(form.toQty);
    if (!fromTarget || !toTarget) return '請輸入代號';
    if (!(fromQty > 0) || !(toQty > 0)) return '轉出與轉入數量須大於 0';
    if (type === '轉帳' && form.fromPlatform === toPlatform) return '轉帳的來源與目的平台不可相同';
    if (type === '兌換' && fromTarget === toTarget) return '兌換的來源與目的代號不可相同';

    const groupId = editing?.legs[0].groupId || newGroupId();
    return [
      { type, date, platform: form.fromPlatform, target: fromTarget, quantity: -fromQty, amount: 0, groupId },
      { type, date, platform: toPlatform, target: toTarget, quantity: toQty, amount: 0, groupId },
    ];
  };

  const handleSubmit = async () => {
    const built = buildEntries();
    if (typeof built === 'string') {
      setMessage({ success: false, text: built });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (editing) {
        // 編輯：逐筆更新（轉帳/兌換為轉出、轉入兩筆）
        for (let i = 0; i < built.length; i++) {
          const response = await fetchWithNotionCredentials(`/api/notion/entries/${editing.legs[i].id}`, credentials, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...built[i], orderId: editing.legs[i].orderId }),
          });
          if (!response.ok) throw new Error((await response.json()).error || '更新失敗');
        }
        setMessage({ success: true, text: '已更新' });
      } else {
        const response = await fetchWithNotionCredentials('/api/notion/entries', credentials, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: built }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || data.error || '新增失敗');
        setMessage({ success: true, text: data.message });
      }
      setEditing(null);
      setForm(prev => ({ ...emptyForm(), type: prev.type, date: prev.date }));
      fetchEntries();
    } catch (err) {
      setMessage({ success: false, text: err instanceof Error ? err.message : '儲存失敗' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row: Row) => {
    const first = row.legs[0];
    const base = { ...emptyForm(), type: first.type, date: first.date };
    if (row.legs.length === 2) {
      const [out, inLeg] = row.legs;
      setForm({
        ...base,
        fromPlatform: out.platform, fromTarget: out.target, fromQty: String(-out.quantity),
        toPlatform: inLeg.platform, toTarget: inLeg.target, toQty: String(inLeg.quantity),
      });
    } else {
      setForm({
        ...base,
        platform: first.platform,
        target: first.target,
        quantity: String(first.type === '調整' ? first.quantity : Math.abs(first.quantity)),
        amount: String(Math.abs(first.amount)),
      });
    }
    setEditing(row);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setForm(emptyForm());
    setMessage(null);
  };

  const handleDelete = async (row: Row) => {
    const label = row.legs.length === 2 ? `這筆${row.legs[0].type}（轉出與轉入兩筆）` : '這筆紀錄';
    if (!window.confirm(`確定要刪除${label}嗎？（Notion 中會移至垃圾桶，可復原）`)) return;

    try {
      const response = await fetchWithNotionCredentials(`/api/notion/entries/${row.legs[0].id}`, credentials, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error((await response.json()).error || '刪除失敗');
      if (editing?.key === row.key) handleCancelEdit();
      fetchEntries();
    } catch (err) {
      setMessage({ success: false, text: err instanceof Error ? err.message : '刪除失敗' });
    }
  };

  const platformOptions = PLATFORMS.map(p => ({ value: p, label: p }));
  const grouped = isGrouped(form.type);

  if (!isCredLoading && !isConfigured) {
    return (
      <DashboardLayout title="記帳">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-neutral-400">尚未設定 Notion 連線</p>
            <Link href="/settings" className="mt-2 inline-block text-sm text-primary-400 hover:underline">前往設定</Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="記帳">
      {/* 新增 / 編輯表單 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-100">{editing ? '編輯紀錄' : '新增紀錄'}</h3>
          {editing && (
            <button onClick={handleCancelEdit} className="text-sm text-neutral-400 hover:text-neutral-200">取消編輯</button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select
              label="類型"
              value={form.type}
              disabled={!!editing}
              onChange={e => updateForm({ type: e.target.value as EntryType })}
              options={ENTRY_TYPES.map(t => ({ value: t, label: t }))}
            />
            <Input label="日期" type="date" value={form.date} onChange={e => updateForm({ date: e.target.value })} />
          </div>

          {!grouped ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select
                label="平台"
                value={form.platform}
                onChange={e => updateForm({ platform: e.target.value as Platform })}
                options={platformOptions}
              />
              <Input
                label="代號"
                placeholder="BTC、USD、0050.TW"
                value={form.target}
                onChange={e => updateForm({ target: e.target.value })}
              />
              <Input
                label={form.type === '調整' ? '調整數量（減少輸入負數，成本不變）' : '數量'}
                type="number"
                min={form.type === '調整' ? undefined : 0}
                step="any"
                value={form.quantity}
                onChange={e => updateForm({ quantity: e.target.value })}
              />
              {form.type !== '利息' && form.type !== '調整' && (
                <Input
                  label={form.type === '賣出' ? '實收金額 (TWD，扣除手續費)' : '金額 (TWD，含手續費)'}
                  type="number"
                  min={0}
                  step="any"
                  value={form.amount}
                  onChange={e => updateForm({ amount: e.target.value })}
                />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 p-3 rounded-2xl bg-neutral-800/40">
                <p className="text-xs font-semibold text-danger-400">轉出</p>
                <Select
                  label="平台"
                  value={form.fromPlatform}
                  onChange={e => updateForm({ fromPlatform: e.target.value as Platform })}
                  options={platformOptions}
                />
                <Input label="代號" value={form.fromTarget} onChange={e => updateForm({ fromTarget: e.target.value })} />
                <Input
                  label="轉出數量"
                  type="number"
                  min={0}
                  step="any"
                  value={form.fromQty}
                  onChange={e => updateForm({
                    fromQty: e.target.value,
                    // 轉入數量尚未手動修改前，跟著轉出數量
                    toQty: form.toQty === form.fromQty ? e.target.value : form.toQty,
                  })}
                />
              </div>
              <div className="space-y-3 p-3 rounded-2xl bg-neutral-800/40">
                <p className="text-xs font-semibold text-success-400">轉入</p>
                {form.type === '轉帳' ? (
                  <Select
                    label="平台"
                    value={form.toPlatform}
                    onChange={e => updateForm({ toPlatform: e.target.value as Platform })}
                    options={platformOptions}
                  />
                ) : (
                  <Input label="代號" value={form.toTarget} onChange={e => updateForm({ toTarget: e.target.value })} />
                )}
                <Input
                  label="轉入數量（扣除手續費後實際到帳）"
                  type="number"
                  min={0}
                  step="any"
                  value={form.toQty}
                  onChange={e => updateForm({ toQty: e.target.value })}
                />
                <p className="text-xs text-neutral-500">
                  {form.type === '轉帳' ? '同一代號在平台間移動，成本跟著移過去' : '同平台內換成另一個代號，成本跟著移過去'}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className={`text-sm ${message?.success ? 'text-success-400' : 'text-danger-400'}`}>{message?.text}</p>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? '儲存中...' : editing ? '更新' : '新增'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 紀錄列表 */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
          <h3 className="text-base font-semibold text-neutral-100">記帳紀錄</h3>
          <div className="grid grid-cols-3 gap-2 md:w-[480px]">
            <Select
              value={filterPlatform}
              onChange={e => setFilterPlatform(e.target.value)}
              options={[{ value: 'all', label: '全部平台' }, ...platformOptions]}
            />
            <Select
              value={filterTarget}
              onChange={e => setFilterTarget(e.target.value)}
              options={[{ value: 'all', label: '全部代號' }, ...targetOptions.map(t => ({ value: t, label: t }))]}
            />
            <Select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              options={[{ value: 'all', label: '全部類型' }, ...ENTRY_TYPES.map(t => ({ value: t, label: t }))]}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-danger-400">{error}</p>
              <button onClick={fetchEntries} className="mt-2 text-sm text-primary-400 hover:underline">重試</button>
            </div>
          ) : loading ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">載入中...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">無紀錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-800">
                  <tr className="text-xs font-semibold text-neutral-100">
                    <th className="px-4 py-3 text-left">日期</th>
                    <th className="px-4 py-3 text-left">類型</th>
                    <th className="px-4 py-3 text-left">平台</th>
                    <th className="px-4 py-3 text-left">代號</th>
                    <th className="px-4 py-3 text-right">數量</th>
                    <th className="px-4 py-3 text-right">金額 (TWD)</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredRows.map(row => {
                    const [first, second] = row.legs;
                    const pair = row.legs.length === 2;
                    return (
                      <tr key={row.key} className={`hover:bg-neutral-800/50 ${editing?.key === row.key ? 'bg-primary-900/20' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums text-neutral-400">{first.date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={
                            first.type === '買入' ? 'text-success-400'
                              : first.type === '賣出' ? 'text-danger-400'
                                : 'text-primary-400'
                          }>{first.type}</span>
                          {first.orderId && <span className="ml-1 text-xs text-neutral-500">BitoPro 匯出</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-neutral-300">
                          {pair && first.platform !== second.platform ? `${first.platform} → ${second.platform}` : first.platform}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-100">
                          {pair && first.target !== second.target ? `${first.target} → ${second.target}` : first.target}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-neutral-100">
                          {pair ? `${fmt(-first.quantity)} → ${fmt(second.quantity)}` : fmt(first.quantity)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-neutral-100">
                          {pair || first.amount === 0 ? '--' : first.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button onClick={() => handleEdit(row)} className="text-primary-400 hover:text-primary-300 mr-3">編輯</button>
                          <button onClick={() => handleDelete(row)} className="text-danger-400 hover:text-danger-300">刪除</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
