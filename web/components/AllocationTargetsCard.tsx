'use client';

import { useEffect, useState } from 'react';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { CATEGORIES } from '@/lib/ledger';
import { AllocationTargets, sumTargets, useAllocationTargets } from '@/hooks/useAllocationTargets';

/** 設定頁：編輯目標配置（加總須為 100%） */
export default function AllocationTargetsCard() {
  const { targets, saveTargets } = useAllocationTargets();
  const [draft, setDraft] = useState<AllocationTargets>(targets);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(targets);
  }, [targets]);

  const total = sumTargets(draft);
  const isValid = Math.abs(total - 100) < 1e-6;

  const handleSave = () => {
    if (!isValid) return;
    saveTargets(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold text-neutral-100">目標配置</h3>
        <p className="text-xs text-neutral-400 mt-1">放貸 = Bitfinex 上的資產；其他 = 不屬於前述分類的資產</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map(category => (
            <Input
              key={category}
              label={`${category} (%)`}
              type="number"
              min={0}
              max={100}
              value={draft[category]}
              onChange={e => setDraft(prev => ({ ...prev, [category]: parseFloat(e.target.value) || 0 }))}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-sm tabular-nums ${isValid ? 'text-neutral-400' : 'text-danger-400'}`}>
            合計 {total}%{!isValid && '（須為 100%）'}
          </p>
          <Button onClick={handleSave} disabled={!isValid}>
            {saved ? '已儲存' : '儲存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
