'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieLabelRenderProps } from 'recharts';

interface AssetData {
  symbol: string;
  valueTWD: number;
  totalAmount: number;
  hasTWDPair: boolean;
}

interface AssetPieChartProps {
  assets: AssetData[];
  mode: 'value' | 'cost';
  showAmounts: boolean;
}

// 資產顏色配置
const COLORS = [
  '#F59E0B', 
  '#10B981', 
  '#6366F1',
  '#3B82F6', 
  '#EF4444', 
  '#8B5CF6', 
  '#EC4899', 
  '#06B6D4', 
  '#84CC16', 
  '#F97316'
];

export default function AssetPieChart({ assets, mode, showAmounts }: AssetPieChartProps) {
  // 過濾有價格的資產並準備圖表資料
  const chartData = assets
    .filter(asset => asset.hasTWDPair && (mode === 'value' ? asset.valueTWD > 0 : asset.totalAmount > 0))
    .map(asset => ({
      name: asset.symbol,
      value: mode === 'value' ? asset.valueTWD : asset.totalAmount,
    }))
    .sort((a, b) => b.value - a.value);

  // 計算總額
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-neutral-200">
          <p className="text-sm font-semibold text-neutral-900">{data.name}</p>
          <p className="text-xs text-neutral-600">
            {showAmounts 
              ? `NT$ ${data.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : '******'
            }
          </p>
          <p className="text-xs text-neutral-500">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // 自定義標籤顯示百分比
  const renderLabel = (props: PieLabelRenderProps): string | undefined => {
    const { name, percent } = props;
    if (typeof percent !== 'number' || percent < 0.05) return undefined;
    return `${name || ''} ${(percent * 100).toFixed(1)}%`;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
        暫無資產資料
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={renderLabel}
            labelLine={false}
            isAnimationActive={false}
            animationDuration={0}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${entry.name}`} 
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={false} />
          <Legend 
            formatter={(value) => <span className="text-xs text-neutral-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
