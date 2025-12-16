'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-neutral-900">API Configuration</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Configure your BitoPro API credentials
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="API Key"
              type="text"
              placeholder="Enter your API key"
              helperText="You can find your API key in BitoPro account settings"
            />
            <Input
              label="API Secret"
              type="password"
              placeholder="Enter your API secret"
              helperText="Keep your API secret secure and never share it"
            />
            <div className="pt-2">
              <Button variant="primary">Save Credentials</Button>
            </div>
          </CardContent>
        </Card>

        {/* Trading Preferences */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-neutral-900">Trading Preferences</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-900">Enable order confirmation</p>
                  <p className="text-xs text-neutral-500">Confirm before placing orders</p>
                </div>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                  defaultChecked
                />
                <div>
                  <p className="text-sm font-medium text-neutral-900">Enable notifications</p>
                  <p className="text-xs text-neutral-500">Show toast notifications for order status</p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-neutral-900">About</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Version</span>
                <span className="font-medium text-neutral-900">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">API Version</span>
                <span className="font-medium text-neutral-900">v3</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
