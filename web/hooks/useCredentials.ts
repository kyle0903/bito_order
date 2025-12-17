'use client';

import { useState, useEffect, useCallback } from 'react';
import { encrypt, decrypt } from '@/lib/crypto';

const STORAGE_KEY = 'bitopro_credentials';

export interface Credentials {
  apiKey: string;
  apiSecret: string;
  email: string;
}

export interface UseCredentialsReturn {
  credentials: Credentials | null;
  isConfigured: boolean;
  isLoading: boolean;
  saveCredentials: (creds: Credentials) => void;
  clearCredentials: () => void;
}

/**
 * Hook 用於管理 localStorage 中的 API 憑證
 */
export function useCredentials(): UseCredentialsReturn {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 從 localStorage 載入憑證
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const decrypted = decrypt(stored);
        if (decrypted) {
          const parsed = JSON.parse(decrypted);
          setCredentials(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 儲存憑證到 localStorage
  const saveCredentials = useCallback((creds: Credentials) => {
    try {
      const json = JSON.stringify(creds);
      const encrypted = encrypt(json);
      localStorage.setItem(STORAGE_KEY, encrypted);
      setCredentials(creds);
    } catch (err) {
      console.error('Failed to save credentials:', err);
    }
  }, []);

  // 清除憑證
  const clearCredentials = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setCredentials(null);
    } catch (err) {
      console.error('Failed to clear credentials:', err);
    }
  }, []);

  return {
    credentials,
    isConfigured: credentials !== null && 
                  credentials.apiKey !== '' && 
                  credentials.apiSecret !== '' && 
                  credentials.email !== '',
    isLoading,
    saveCredentials,
    clearCredentials,
  };
}
