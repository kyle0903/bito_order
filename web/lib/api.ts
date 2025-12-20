import { Credentials } from '@/hooks/useCredentials';
import { NotionCredentials } from '@/hooks/useNotionCredentials';

/**
 * 將 BitoPro 憑證轉換為 headers
 */
export function getCredentialsHeaders(credentials: Credentials | null): HeadersInit {
  if (!credentials) return {};

  return {
    'X-API-Key': credentials.apiKey,
    'X-API-Secret': credentials.apiSecret,
    'X-API-Email': credentials.email,
  };
}

/**
 * 帶 BitoPro 憑證的 fetch 函數
 */
export async function fetchWithCredentials(
  url: string,
  credentials: Credentials | null,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...options.headers,
    ...getCredentialsHeaders(credentials),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

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

