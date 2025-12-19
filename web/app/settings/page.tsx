'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card, { CardHeader, CardContent } from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useCredentials } from '@/hooks/useCredentials';
import { fetchWithCredentials } from '@/lib/api';

interface BalanceItem {
  currency: string;
  amount: string;
  available: string;
}

export default function SettingsPage() {
  const { credentials, isConfigured, isLoading, saveCredentials, clearCredentials } = useCredentials();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [email, setEmail] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 連線測試狀態
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [accountBalances, setAccountBalances] = useState<BalanceItem[]>([]);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);

  // 載入現有憑證
  useEffect(() => {
    if (credentials) {
      setApiKey(credentials.apiKey);
      setApiSecret(credentials.apiSecret);
      setEmail(credentials.email);
    }
  }, [credentials]);

  // 測試 API 連線
  const testConnection = useCallback(async () => {
    if (!isConfigured) return;

    setConnectionStatus('testing');
    setConnectionMessage('正在測試連線...');

    try {
      const response = await fetchWithCredentials('/api/bitopro/balance', credentials);

      if (response.ok) {
        const data = await response.json();
        const balances = (data.data || []).filter((b: BalanceItem) => parseFloat(b.amount) > 0.0001);
        setAccountBalances(balances);
        setConnectionStatus('success');
        setConnectionMessage('API 連線成功');
        setLastTestTime(new Date());
      } else {
        const errorData = await response.json();
        setConnectionStatus('error');
        setConnectionMessage(errorData.error || 'API 連線失敗');
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionMessage(err instanceof Error ? err.message : '連線失敗');
    }
  }, [credentials, isConfigured]);

  // 自動測試連線（當憑證設定後）
  useEffect(() => {
    if (isConfigured && connectionStatus === 'idle') {
      testConnection();
    }
  }, [isConfigured, connectionStatus, testConnection]);

  const handleSave = () => {
    saveCredentials({ apiKey, apiSecret, email });
    setSaveSuccess(true);
    setConnectionStatus('idle'); // 重置連線狀態以便重新測試
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleClear = () => {
    if (confirm('確定要清除您的 API 憑證嗎？')) {
      clearCredentials();
      setApiKey('');
      setApiSecret('');
      setEmail('');
      setConnectionStatus('idle');
      setAccountBalances([]);
    }
  };

  return (
    <DashboardLayout title="設定">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側：API 設定 */}
        <div className="space-y-6">
          {/* API 設定 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-100">API 設定</h3>
                  <p className="text-sm text-neutral-400 mt-1">
                    設定您的 BitoPro API 憑證
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${isLoading ? 'bg-neutral-800 text-neutral-400' :
                  isConfigured ? 'bg-success-900/30 text-success-400' : 'bg-warning-900/30 text-warning-400'
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
              <h3 className="text-base font-semibold text-neutral-100">關於</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">版本</span>
                  <span className="font-medium text-neutral-100">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">API 版本</span>
                  <span className="font-medium text-neutral-100">v3</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右側：連線狀態 & 帳戶資訊 */}
        <div className="space-y-6">
          {/* 連線狀態 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-100">連線狀態</h3>
                {isConfigured && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={testConnection}
                    disabled={connectionStatus === 'testing'}
                  >
                    {connectionStatus === 'testing' ? '測試中...' : '重新測試'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isConfigured ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-neutral-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="text-sm text-neutral-400">請先設定 API 憑證</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 連線狀態指示器 */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50">
                    <div className={`w-3 h-3 rounded-full ${connectionStatus === 'success' ? 'bg-success-500' :
                      connectionStatus === 'error' ? 'bg-danger-500' :
                        connectionStatus === 'testing' ? 'bg-warning-500 animate-pulse' :
                          'bg-neutral-600'
                      }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${connectionStatus === 'success' ? 'text-success-400' :
                        connectionStatus === 'error' ? 'text-danger-400' :
                          'text-neutral-300'
                        }`}>
                        {connectionMessage || '尚未測試'}
                      </p>
                      {lastTestTime && connectionStatus === 'success' && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          最後測試：{lastTestTime.toLocaleTimeString('zh-TW')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 帳戶資訊 */}
          {isConfigured && (
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold text-neutral-100">帳戶餘額</h3>
              </CardHeader>
              <CardContent>
                {connectionStatus === 'testing' ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-neutral-400">載入中...</p>
                  </div>
                ) : connectionStatus === 'error' ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-danger-400">無法取得帳戶資訊</p>
                  </div>
                ) : accountBalances.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-neutral-400">尚無餘額資料</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accountBalances.slice(0, 8).map((balance) => (
                      <div key={balance.currency} className="flex justify-between items-center py-2 border-b border-neutral-800 last:border-0">
                        <span className="text-sm font-medium text-neutral-300">{balance.currency.toUpperCase()}</span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-neutral-100 tabular-nums">
                            {parseFloat(balance.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                          </p>
                          <p className="text-xs text-neutral-500 tabular-nums">
                            可用：{parseFloat(balance.available).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {accountBalances.length > 8 && (
                      <p className="text-xs text-neutral-500 text-center pt-2">
                        還有 {accountBalances.length - 8} 種資產...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 快速連結 */}
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-neutral-100">快速連結</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <a
                  href="https://github.com/bitoex/bitopro-offical-api-docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-900/50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-200 group-hover:text-neutral-100">API 文件</p>
                    <p className="text-xs text-neutral-500">查看 BitoPro API 文件</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-500 group-hover:text-neutral-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
                <a
                  href="https://www.bitopro.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-900/50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-200 group-hover:text-neutral-100">BitoPro 官網</p>
                    <p className="text-xs text-neutral-500">前往 BitoPro 交易所</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-500 group-hover:text-neutral-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
