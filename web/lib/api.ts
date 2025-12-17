import { Credentials } from '@/hooks/useCredentials';

/**
 * 將憑證轉換為 headers
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
 * 帶憑證的 fetch 函數
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
