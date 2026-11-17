'use client';

import { useState, useEffect, useCallback } from 'react';
import { encrypt, decrypt } from '@/lib/crypto';

const STORAGE_KEY = 'bitfinex_credentials';

export interface BitfinexCredentials {
    apiKey: string;
    apiSecret: string;
}

/**
 * Hook 用於管理 localStorage 中的 Bitfinex API 憑證（唯讀金鑰）
 */
export function useBitfinexCredentials() {
    const [credentials, setCredentials] = useState<BitfinexCredentials | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const decrypted = stored ? decrypt(stored) : null;
            if (decrypted) setCredentials(JSON.parse(decrypted));
        } catch (err) {
            console.error('Failed to load Bitfinex credentials:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveCredentials = useCallback((creds: BitfinexCredentials) => {
        localStorage.setItem(STORAGE_KEY, encrypt(JSON.stringify(creds)));
        setCredentials(creds);
    }, []);

    const clearCredentials = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setCredentials(null);
    }, []);

    return {
        credentials,
        isConfigured: !!credentials?.apiKey && !!credentials?.apiSecret,
        isLoading,
        saveCredentials,
        clearCredentials,
    };
}
