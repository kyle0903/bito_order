'use client';

import { useState, useEffect, useCallback } from 'react';
import Card, { CardHeader, CardContent } from './Card';
import Input from './Input';
import Button from './Button';
import { useBitfinexCredentials } from '@/hooks/useBitfinexCredentials';
import { fetchWithBitfinexCredentials } from '@/lib/api';

/** 設定頁的 Bitfinex 唯讀 API 憑證 */
export default function BitfinexSettingsCard() {
  const { credentials, isConfigured, isLoading, saveCredentials, clearCredentials } = useBitfinexCredentials();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (credentials) {
      setApiKey(credentials.apiKey);
      setApiSecret(credentials.apiSecret);
    }
  }, [credentials]);

  const testConnection = useCallback(async () => {
    if (!isConfigured) return;
    setStatus('testing');
    setMessage('正在測試連線...');
    try {
      const response = await fetchWithBitfinexCredentials('/api/bitfinex/summary', credentials);
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || '連線失敗');
      setStatus('success');
      setMessage(`連線成功！放貸錢包 ${data.data.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD`);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : '連線失敗');
    }
  }, [credentials, isConfigured]);

  useEffect(() => {
    if (isConfigured && status === 'idle') testConnection();
  }, [isConfigured, status, testConnection]);

  const handleSave = () => {
    saveCredentials({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim() });
    setSaved(true);
    setStatus('idle');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    if (!confirm('確定要清除您的 Bitfinex API 憑證嗎？')) return;
    clearCredentials();
    setApiKey('');
    setApiSecret('');
    setStatus('idle');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">Bitfinex 設定</h3>
            <p className="text-sm text-neutral-400 mt-1">讀取放貸明細與每月利息</p>
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
          label="API Key"
          type="text"
          placeholder="輸入 Bitfinex API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          helperText="請建立唯讀金鑰：只開啟 Wallets、Margin Funding、Account History 的讀取權限"
        />
        <Input
          label="API Secret"
          type="password"
          placeholder="輸入 Bitfinex API Secret"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
        />

        {isConfigured && (
          <div className="p-3 rounded-2xl bg-neutral-800/50 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${status === 'success' ? 'bg-success-500' :
              status === 'error' ? 'bg-danger-500' :
                status === 'testing' ? 'bg-warning-500 animate-pulse' : 'bg-neutral-600'
              }`} />
            <p className={`text-sm ${status === 'success' ? 'text-success-400' : status === 'error' ? 'text-danger-400' : 'text-neutral-300'}`}>
              {message || '尚未測試'}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={handleSave} disabled={!apiKey || !apiSecret}>
            {saved ? '✓ 已儲存！' : '儲存設定'}
          </Button>
          {isConfigured && (
            <>
              <Button variant="secondary" onClick={testConnection} disabled={status === 'testing'}>
                {status === 'testing' ? '測試中...' : '測試連線'}
              </Button>
              <Button variant="secondary" onClick={handleClear}>清除設定</Button>
            </>
          )}
        </div>
        <p className="text-xs text-neutral-500">您的 Bitfinex 憑證將加密儲存在瀏覽器本機中。</p>
      </CardContent>
    </Card>
  );
}
