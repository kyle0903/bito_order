'use client';

import { useEffect, useState } from 'react';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useTwFeeDiscount } from '@/hooks/useTwFeeDiscount';

/** 設定頁：台股手續費折數（記帳時自動計算金額用） */
export default function TwFeeDiscountCard() {
  const { discount, saveDiscount } = useTwFeeDiscount();
  const [draft, setDraft] = useState(String(discount));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(String(discount));
  }, [discount]);

  const value = parseFloat(draft);
  const isValid = value > 0 && value <= 10;

  const handleSave = () => {
    if (!isValid) return;
    saveDiscount(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold text-neutral-100">台股手續費</h3>
        <p className="text-xs text-neutral-400 mt-1">
          記帳時依 0.1425% × 折數計算手續費（整股最低 20 元、零股最低 1 元），賣出另計證交稅（股票 0.3%、ETF 0.1%）
        </p>
      </CardHeader>
      <CardContent className="flex items-end gap-3">
        <div className="w-40">
          <Input
            label="折數（6 = 6 折）"
            type="number"
            min={0}
            max={10}
            step="any"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={!isValid}>
          {saved ? '已儲存' : '儲存'}
        </Button>
      </CardContent>
    </Card>
  );
}
