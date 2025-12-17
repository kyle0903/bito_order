'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useCredentials } from '@/hooks/useCredentials';

export default function SettingsPage() {
  const { credentials, isConfigured, isLoading, saveCredentials, clearCredentials } = useCredentials();
  
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [email, setEmail] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 載入現有憑證
  useEffect(() => {
    if (credentials) {
      setApiKey(credentials.apiKey);
      setApiSecret(credentials.apiSecret);
      setEmail(credentials.email);
    }
  }, [credentials]);

  const handleSave = () => {
    saveCredentials({ apiKey, apiSecret, email });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear your API credentials?')) {
      clearCredentials();
      setApiKey('');
      setApiSecret('');
      setEmail('');
    }
  };

  return (
    <DashboardLayout title="設定">
      <div className="max-w-2xl space-y-6">

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">API Configuration</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  Configure your BitoPro API credentials
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                isLoading ? 'bg-neutral-100 text-neutral-600' :
                isConfigured ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'
              }`}>
                {isLoading ? 'Loading...' : isConfigured ? 'Configured' : 'Not Configured'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="API Key"
              type="text"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              helperText="You can find your API key in BitoPro account settings"
            />
            <Input
              label="API Secret"
              type="password"
              placeholder="Enter your API secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              helperText="Keep your API secret secure and never share it"
            />
            <Input
              label="Email"
              type="email"
              placeholder="Enter your BitoPro email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="The email associated with your BitoPro account"
            />
            <div className="flex items-center gap-3 pt-2">
              <Button 
                variant="primary" 
                onClick={handleSave}
                disabled={!apiKey || !apiSecret || !email}
              >
                {saveSuccess ? '✓ Saved!' : 'Save Credentials'}
              </Button>
              {isConfigured && (
                <Button variant="secondary" onClick={handleClear}>
                  Clear Credentials
                </Button>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              Your credentials are stored locally in your browser and encrypted.
            </p>
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

