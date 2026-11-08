'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieLabelRenderProps } from 'recharts';

import { Category } from '@/lib/ledger';

interface CategoryData {
  category: Category;
  value: number; // 現值 (TWD)
}

interface AssetPieChartProps {
  data: CategoryData[];
  showAmounts: boolean;
}

// 分類顏色（與目標配置表共用）
export const CATEGORY_COLORS: Record<Category, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  放貸: '#16B157',
  台股: '#EF4444',
  美股: '#06B6D4',
  其他: '#A3A3A3',
};

export default function AssetPieChart({ data, showAmounts }: AssetPieChartProps) {
  // 依分類的現值準備圖表資料
  const chartData = data
    .filter(item => item.value > 0)
    .map(item => ({ name: item.category, value: item.value }))
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
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={CATEGORY_COLORS[entry.name]}
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
