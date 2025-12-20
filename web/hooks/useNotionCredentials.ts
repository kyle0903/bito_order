'use client';

import { useState, useEffect, useCallback } from 'react';
import { encrypt, decrypt } from '@/lib/crypto';

const STORAGE_KEY = 'notion_credentials';

export interface NotionCredentials {
    apiToken: string;
    databaseId: string;
}

export interface UseNotionCredentialsReturn {
    credentials: NotionCredentials | null;
    isConfigured: boolean;
    isLoading: boolean;
    saveCredentials: (creds: NotionCredentials) => void;
    clearCredentials: () => void;
}

/**
 * Hook 用於管理 localStorage 中的 Notion API 憑證
 */
export function useNotionCredentials(): UseNotionCredentialsReturn {
    const [credentials, setCredentials] = useState<NotionCredentials | null>(null);
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
            console.error('Failed to load Notion credentials:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 儲存憑證到 localStorage
    const saveCredentials = useCallback((creds: NotionCredentials) => {
        try {
            const json = JSON.stringify(creds);
            const encrypted = encrypt(json);
            localStorage.setItem(STORAGE_KEY, encrypted);
            setCredentials(creds);
        } catch (err) {
            console.error('Failed to save Notion credentials:', err);
        }
    }, []);

    // 清除憑證
    const clearCredentials = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            setCredentials(null);
        } catch (err) {
            console.error('Failed to clear Notion credentials:', err);
        }
    }, []);

    return {
        credentials,
        isConfigured: credentials !== null &&
            credentials.apiToken !== '' &&
            credentials.databaseId !== '',
        isLoading,
        saveCredentials,
        clearCredentials,
    };
}
