// 簡單的加密/解密工具
// 使用 Base64 + XOR 混淆，非高安全性加密，僅防止明文暴露

const ENCRYPTION_KEY = 'bitopro-dashboard-2024';

/**
 * 簡單加密函數
 * @param text 要加密的文字
 * @returns 加密後的字串
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  // XOR 混淆
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    encrypted += String.fromCharCode(charCode);
  }
  
  // Base64 編碼
  return btoa(encrypted);
}

/**
 * 簡單解密函數
 * @param encryptedText 加密的文字
 * @returns 解密後的字串
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  
  try {
    // Base64 解碼
    const decoded = atob(encryptedText);
    
    // XOR 還原
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    return decrypted;
  } catch {
    return '';
  }
}
