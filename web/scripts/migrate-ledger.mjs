/**
 * 一次性遷移：為 Notion 記帳 Database 新增 Platform / Type / GroupId / OrderId 欄位，並回填舊資料
 *
 * 使用方式（在 web/ 目錄下）：
 *   node scripts/migrate-ledger.mjs           # 預覽（不寫入）
 *   node scripts/migrate-ledger.mjs --apply   # 實際寫入
 *
 * 讀取 web/.env 的 NOTION_API_TOKEN 與 NOTION_DATABASE_ID
 *
 * 回填規則：
 *   Platform：.TW 結尾 → 券商；BitoPro 有 TWD 交易對（或 TWD 本身）→ BitoPro；其他 → 券商
 *   Type：數量為負 → 賣出；金額為 0 → 利息；其他 → 買入
 */
import 'dotenv/config';
import { Client } from '@notionhq/client';

const APPLY = process.argv.includes('--apply');
const token = process.env.NOTION_API_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;

if (!token || !databaseId) {
  console.error('請在 web/.env 設定 NOTION_API_TOKEN 與 NOTION_DATABASE_ID');
  process.exit(1);
}

const notion = new Client({ auth: token });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NEW_PROPERTIES = {
  Platform: { select: { options: [{ name: 'BitoPro' }, { name: 'Bitfinex' }, { name: 'Ether.fi' }, { name: '券商' }] } },
  Type: { select: { options: ['買入', '賣出', '利息', '轉帳', '兌換', '調整'].map((name) => ({ name })) } },
  GroupId: { rich_text: {} },
  OrderId: { rich_text: {} },
};

async function getBitoProBases() {
  const res = await fetch('https://api.bitopro.com/v3/provisioning/trading-pairs');
  if (!res.ok) throw new Error(`無法取得 BitoPro 交易對：HTTP ${res.status}`);
  const json = await res.json();
  return new Set(
    (json.data || [])
      .filter((p) => String(p.quote).toLowerCase() === 'twd')
      .map((p) => String(p.base).toUpperCase())
  );
}

function inferPlatform(target, bitoBases) {
  if (target.endsWith('.TW')) return '券商';
  if (target === 'TWD' || bitoBases.has(target)) return 'BitoPro';
  return '券商';
}

function inferType(quantity, amount) {
  if (quantity < 0) return '賣出';
  if (amount === 0) return '利息';
  return '買入';
}

async function main() {
  console.log(APPLY ? '=== 實際寫入模式 ===' : '=== 預覽模式（加 --apply 才會寫入）===');

  // 1. 新增欄位
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const missing = Object.fromEntries(
    Object.entries(NEW_PROPERTIES).filter(([name]) => !(name in db.properties))
  );
  console.log(`缺少的欄位：${Object.keys(missing).join(', ') || '（無）'}`);
  if (APPLY && Object.keys(missing).length > 0) {
    await notion.databases.update({ database_id: databaseId, properties: missing });
    console.log('已新增欄位');
  }

  // 2. 讀取全部紀錄
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({ database_id: databaseId, start_cursor: cursor, page_size: 100 });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  console.log(`共 ${pages.length} 筆紀錄`);

  // 3. 回填
  const bitoBases = await getBitoProBases();
  let updated = 0;
  for (const page of pages) {
    const p = page.properties;
    const target = (p.Target?.select?.name || '').toUpperCase();
    if (!target) continue;

    const quantity = p.Quantity?.number || 0;
    const amount = p.Amount?.number || 0;
    const update = {};
    if (!p.Platform?.select?.name) update.Platform = { select: { name: inferPlatform(target, bitoBases) } };
    if (!p.Type?.select?.name) update.Type = { select: { name: inferType(quantity, amount) } };
    if (Object.keys(update).length === 0) continue;

    const date = p.Date?.date?.start || '';
    console.log(
      `${date} ${target.padEnd(8)} qty=${quantity} amt=${amount} → ` +
      Object.entries(update).map(([k, v]) => `${k}=${v.select.name}`).join(' ')
    );

    if (APPLY) {
      await notion.pages.update({ page_id: page.id, properties: update });
      await sleep(350); // Notion API 速率限制約 3 req/s
    }
    updated++;
  }

  console.log(`${APPLY ? '已更新' : '將更新'} ${updated} 筆紀錄`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
