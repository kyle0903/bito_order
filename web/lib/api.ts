import { NotionCredentials } from '@/hooks/useNotionCredentials';
import { BitfinexCredentials } from '@/hooks/useBitfinexCredentials';

/**
 * 將 Notion 憑證轉換為 headers
 */
export function getNotionCredentialsHeaders(credentials: NotionCredentials | null): HeadersInit {
  if (!credentials) return {};

  return {
    'X-Notion-Token': credentials.apiToken,
    'X-Notion-Database-Id': credentials.databaseId,
  };
}

/**
 * 帶 Notion 憑證的 fetch 函數
 */
export async function fetchWithNotionCredentials(
  url: string,
  credentials: NotionCredentials | null,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...options.headers,
    ...getNotionCredentialsHeaders(credentials),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * 帶 Bitfinex 憑證的 fetch 函數
 */
export async function fetchWithBitfinexCredentials(
  url: string,
  credentials: BitfinexCredentials | null,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(credentials ? { 'X-Bitfinex-Key': credentials.apiKey, 'X-Bitfinex-Secret': credentials.apiSecret } : {}),
    },
  });
}

