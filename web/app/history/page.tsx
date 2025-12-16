'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';

const mockOrders = [
  {
    id: '1',
    pair: 'BTC_TWD',
    type: 'market',
    side: 'buy',
    amount: 0.005,
    price: 1350000,
    total: 6750,
    status: 'filled',
    timestamp: '2025-12-16 10:30:15',
  },
  {
    id: '2',
    pair: 'ETH_TWD',
    type: 'limit',
    side: 'sell',
    amount: 0.5,
    price: 65000,
    total: 32500,
    status: 'filled',
    timestamp: '2025-12-16 09:15:42',
  },
  {
    id: '3',
    pair: 'BTC_TWD',
    type: 'limit',
    side: 'buy',
    amount: 0.01,
    price: 1340000,
    total: 13400,
    status: 'cancelled',
    timestamp: '2025-12-15 16:45:20',
  },
];

export default function HistoryPage() {
  return (
    <DashboardLayout title="Order History">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-900">Recent Orders</h3>
            <button className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
              Export
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Pair
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {mockOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 tabular-nums">
                      {order.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {order.pair.replace('_', '/')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 capitalize">
                      {order.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`font-medium ${
                          order.side === 'buy' ? 'text-success-600' : 'text-danger-600'
                        }`}
                      >
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 text-right tabular-nums">
                      {order.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 text-right tabular-nums">
                      ${order.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 text-right tabular-nums">
                      ${order.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${
                            order.status === 'filled'
                              ? 'bg-success-100 text-success-700'
                              : order.status === 'cancelled'
                              ? 'bg-neutral-100 text-neutral-700'
                              : 'bg-primary-100 text-primary-700'
                          }
                        `}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
