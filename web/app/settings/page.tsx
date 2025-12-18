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
    if (confirm('確定要清除您的 API 憑證嗎？')) {
      clearCredentials();
      setApiKey('');
      setApiSecret('');
      setEmail('');
    }
  };

  return (
    <DashboardLayout title="設定">
      <div className="max-w-2xl space-y-6">

        {/* API 設定 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">API 設定</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  設定您的 BitoPro API 憑證
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded ${isLoading ? 'bg-neutral-100 text-neutral-600' :
                  isConfigured ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'
                }`}>
                {isLoading ? '載入中...' : isConfigured ? '已設定' : '未設定'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="API 金鑰"
              type="text"
              placeholder="輸入您的 API 金鑰"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              helperText="您可以在 BitoPro 帳戶設定中找到您的 API 金鑰"
            />
            <Input
              label="API 私鑰"
              type="password"
              placeholder="輸入您的 API 私鑰"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              helperText="請妥善保管您的 API 私鑰，切勿分享給他人"
            />
            <Input
              label="電子郵件"
              type="email"
              placeholder="輸入您的 BitoPro 電子郵件"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="與您 BitoPro 帳戶關聯的電子郵件"
            />
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!apiKey || !apiSecret || !email}
              >
                {saveSuccess ? '✓ 已儲存！' : '儲存憑證'}
              </Button>
              {isConfigured && (
                <Button variant="secondary" onClick={handleClear}>
                  清除憑證
                </Button>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              您的憑證將加密儲存在瀏覽器本機中。
            </p>
          </CardContent>
        </Card>

        {/* 關於 */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-neutral-900">關於</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">版本</span>
                <span className="font-medium text-neutral-900">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">API 版本</span>
                <span className="font-medium text-neutral-900">v3</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

