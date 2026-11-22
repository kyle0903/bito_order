/**
 * Bitfinex REST API v2 封裝（僅限 server 端，唯讀）
 * 簽章：HMAC-SHA384(secret, `/api/v2/{path}{nonce}{body}`)，hex
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.bitfinex.com';
const DAY_MS = 86400000;

export interface BitfinexCredentials {
  apiKey: string;
  apiSecret: string;
}

/** 從 request headers 取得憑證；未設定時回傳錯誤 Response */
export function getBitfinexFromRequest(request: NextRequest): BitfinexCredentials | { error: NextResponse } {
  const apiKey = request.headers.get('X-Bitfinex-Key');
  const apiSecret = request.headers.get('X-Bitfinex-Secret');
  if (!apiKey || !apiSecret) {
    return { error: NextResponse.json({ error: 'Bitfinex API 憑證未設定', notConfigured: true }, { status: 401 }) };
  }
  return { apiKey, apiSecret };
}

// nonce 須嚴格遞增；同一毫秒內的多次呼叫靠遞增避免重複
let lastNonce = 0;
function nextNonce(): string {
  lastNonce = Math.max(Date.now() * 1000, lastNonce + 1);
  return String(lastNonce);
}

async function authPost<T>(creds: BitfinexCredentials, path: string, body: object = {}): Promise<T> {
  const nonce = nextNonce();
  const bodyJson = JSON.stringify(body);
  const signature = crypto
    .createHmac('sha384', creds.apiSecret)
    .update(`/api/v2/${path}${nonce}${bodyJson}`)
    .digest('hex');

  const response = await fetch(`${BASE_URL}/v2/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'bfx-nonce': nonce,
      'bfx-apikey': creds.apiKey,
      'bfx-signature': signature,
    },
    body: bodyJson,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  const json = await response.json();
  // 錯誤格式：["error", code, "message"]
  if (!response.ok || (Array.isArray(json) && json[0] === 'error')) {
    throw new Error(`Bitfinex ${path}: ${Array.isArray(json) ? json[2] : response.status}`);
  }
  return json as T;
}

export interface FundingLoan {
  id: number;
  amount: number;
  dailyRate: number; // 日利率（0.0002 = 每日 0.02%）
  periodDays: number;
  openedAt: number; // ms
  expiresAt: number; // ms
}

export interface FundingOffer {
  id: number;
  amount: number;
  dailyRate: number;
  periodDays: number;
}

export interface LendingSummary {
  currency: string;
  balance: number; // funding 錢包餘額
  loans: FundingLoan[]; // 已借出
  offers: FundingOffer[]; // 掛單中（尚未借出）
  idle: number; // 閒置 = 餘額 − 已借出 − 掛單中
  monthInterest: number; // 本月至今利息
}

/** 台灣時間（UTC+8）某月起訖的 ms；month 格式 YYYY-MM */
export function monthRange(month: string): { start: number; end: number } {
  const [y, m] = month.split('-').map(Number);
  const start = Date.UTC(y, m - 1, 1) - 8 * 3600 * 1000;
  const end = Date.UTC(y, m, 1) - 8 * 3600 * 1000 - 1;
  return { start, end };
}

/** 某段期間的放貸利息總和（ledger 類別 28：margin / swap / interest payment，限 funding 錢包） */
export async function sumInterest(creds: BitfinexCredentials, currency: string, start: number, end: number): Promise<number> {
  const rows = await authPost<unknown[][]>(creds, `auth/r/ledgers/${currency}/hist`, {
    category: 28, start, end, limit: 2500,
  });
  return rows
    .filter(r => r[2] === 'funding')
    .reduce((sum, r) => sum + (Number(r[5]) || 0), 0);
}

export async function getLendingSummary(creds: BitfinexCredentials, currency = 'USD'): Promise<LendingSummary> {
  const symbol = `f${currency}`;
  // 依序呼叫（nonce 必須遞增，平行請求可能亂序）
  const wallets = await authPost<unknown[][]>(creds, 'auth/r/wallets');
  const credits = await authPost<unknown[][]>(creds, `auth/r/funding/credits/${symbol}`);
  const loansRaw = await authPost<unknown[][]>(creds, `auth/r/funding/loans/${symbol}`);
  const offersRaw = await authPost<unknown[][]>(creds, `auth/r/funding/offers/${symbol}`);

  const wallet = wallets.find(w => w[0] === 'funding' && w[1] === currency);
  const balance = Number(wallet?.[2]) || 0;

  // credits（用於倉位）與 loans（未用於倉位）都是借出的資金；SIDE 1 = 出借方、0 = 雙方
  const seen = new Set<number>();
  const loans: FundingLoan[] = [...credits, ...loansRaw]
    .filter(r => Number(r[2]) >= 0 && !seen.has(Number(r[0])) && seen.add(Number(r[0])))
    .map(r => {
      const openedAt = Number(r[13]) || Number(r[3]);
      const periodDays = Number(r[12]) || 0;
      return {
        id: Number(r[0]),
        amount: Math.abs(Number(r[5]) || 0),
        dailyRate: Number(r[11]) || 0,
        periodDays,
        openedAt,
        expiresAt: openedAt + periodDays * DAY_MS,
      };
    })
    .sort((a, b) => a.expiresAt - b.expiresAt);

  const offers: FundingOffer[] = offersRaw.map(r => ({
    id: Number(r[0]),
    amount: Math.abs(Number(r[4]) || 0),
    dailyRate: Number(r[14]) || 0,
    periodDays: Number(r[15]) || 0,
  }));

  const lent = loans.reduce((sum, l) => sum + l.amount, 0);
  const offered = offers.reduce((sum, o) => sum + o.amount, 0);

  const now = Date.now();
  const thisMonth = new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 7);
  const monthInterest = await sumInterest(creds, currency, monthRange(thisMonth).start, now);

  return {
    currency,
    balance,
    loans,
    offers,
    idle: Math.max(balance - lent - offered, 0),
    monthInterest,
  };
}
