'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DailyPoint } from '@/lib/performance';

interface PerformanceChartProps {
  data: DailyPoint[];
  showAmounts: boolean;
  compact?: boolean; // 總覽頁的迷你走勢：無座標軸、圖例與提示框
}

const VALUE_COLOR = '#2997ff'; // primary-400
const INVESTED_COLOR = '#8e8e93'; // neutral-400，參考線（虛線）

const formatTWD = (n: number) => `NT$ ${Math.round(n).toLocaleString('en-US')}`;
const formatAxis = (n: number) => (Math.abs(n) >= 10000 ? `${Math.round(n / 10000).toLocaleString('en-US')}萬` : String(Math.round(n)));

export default function PerformanceChart({ data, showAmounts, compact = false }: PerformanceChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-neutral-400">暫無資料</div>;
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DailyPoint }> }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    const profit = point.value - point.invested;
    const mask = (text: string) => (showAmounts ? text : '******');
    return (
      <div className="bg-neutral-800 px-3 py-2 rounded-xl shadow-lg text-xs space-y-0.5">
        <p className="font-semibold text-neutral-100">{point.date}</p>
        <p className="text-neutral-300"><span className="inline-block w-2 h-0.5 mr-1.5 align-middle" style={{ backgroundColor: VALUE_COLOR }} />淨值 {mask(formatTWD(point.value))}</p>
        <p className="text-neutral-300"><span className="inline-block w-2 h-0.5 mr-1.5 align-middle" style={{ backgroundColor: INVESTED_COLOR }} />淨投入 {mask(formatTWD(point.invested))}</p>
        <p className="text-neutral-400">損益 {mask(`${profit >= 0 ? '+' : ''}${formatTWD(profit)}`)}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={compact ? { top: 4, right: 0, bottom: 4, left: 0 } : { top: 8, right: 8, bottom: 0, left: 0 }}>
        {!compact && <CartesianGrid vertical={false} stroke="#2c2c2e" />}
        <XAxis
          dataKey="date"
          hide={compact}
          tick={{ fill: '#8e8e93', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#3a3a3c' }}
          tickFormatter={(d: string) => d.slice(0, 7)}
          minTickGap={40}
        />
        <YAxis
          hide={compact || !showAmounts}
          width={56}
          tick={{ fill: '#8e8e93', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxis}
          domain={['auto', 'auto']}
        />
        {!compact && (
          <Tooltip
            content={<CustomTooltip />}
            isAnimationActive={false}
            cursor={{ stroke: '#636366', strokeWidth: 1 }}
          />
        )}
        {!compact && (
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            formatter={(value) => <span className="text-xs text-neutral-400">{value}</span>}
          />
        )}
        <Line
          name="累計淨投入"
          type="stepAfter"
          dataKey="invested"
          stroke={INVESTED_COLOR}
          strokeWidth={compact ? 1.5 : 2}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        <Line
          name="淨值"
          type="monotone"
          dataKey="value"
          stroke={VALUE_COLOR}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: '#1c1c1e', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
