# A CUBE — 個人投資資產管理儀表板

> 以 BitoPro 交易所 API 為基礎、Notion 作為記帳資料庫的個人投資管理介面。支援 BitoPro、Bitfinex 放貸、Ether.fi 支付卡與券商（台股 / 美股）等多平台記帳，以平均成本法計算持倉與已實現損益，並對照目標配置協助再平衡。

## ✨ 功能特色

### 📊 資產總覽 (`/`)
- 即時顯示投資組合總市值（TWD / USD）與 24h 加權漲跌
- 損益拆分為**未實現**（目前持有）與**已實現**（已賣出）兩個數字
- 資產列表以「代號 + 平台」為單位，附幣種 / 公司圖示與彩色平台標籤
- 依分類（台股、美股、BTC、ETH、放貸、其他）的現值圓餅圖
- **目標配置對照**：目標 %、目前 %、偏離、調整至目標需買賣的金額（偏離 ±5% 內視為正常）
- 已結清部位收合顯示各自的已實現損益（例如全部賣出的 ADA）
- 支付用途資產（Ether.fi）獨立收合顯示，不計入總資產與配置
- 金額隱藏 / 顯示切換、USD/TWD 匯率、恐懼貪婪指數

### ✎ 記帳 (`/ledger`)
- 新增買入、賣出、利息、轉帳、兌換、調整六種紀錄
- 轉帳與兌換一次產生轉出、轉入兩筆，並以 GroupId 綁定
- 依平台、代號、類型篩選紀錄
- 編輯與刪除（刪除為 Notion 封存，可從垃圾桶復原；成組紀錄會一起處理）

### 📋 歷史訂單 (`/history`)
- 依幣種、狀態篩選 BitoPro 歷史訂單
- 批次匯出成交紀錄至 Notion，自動帶入平台、類型、手續費與訂單編號
- 已匯出的訂單會標示「已匯出」，不會重複匯出

### 📈 市場行情 (`/market`)
- 主流幣種最新成交價、24h 漲跌幅、成交量
- 拖放排序自訂顯示順序（含觸控支援），設定儲存於 localStorage

### ⇄ 交易下單 (`/trading`)
- 市價單 / 限價單下單（買入 / 賣出）
- WebSocket 即時訂單簿價格串流
- 可用餘額查詢、當前掛單列表與一鍵取消

### ⚙️ 設定 (`/settings`)
- BitoPro API 憑證（API Key / Secret / Email）與 Notion API 憑證（Token / Database ID），含連線驗證
- 目標配置編輯（加總須為 100%，預設 BTC 40%、放貸 50%、ETH 10%）
- 憑證與目標配置皆儲存於瀏覽器 localStorage（憑證經 XOR + Base64 混淆）

---

## 📒 記帳模型

所有投資紀錄存放在一個 Notion Database，每一筆紀錄是一個頁面。

### Notion 欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| `Target` | Select | 代號，如 `BTC`、`USD`、`2330.TW` |
| `Date` | Date | 日期（YYYY-MM-DD） |
| `Quantity` | Number | 數量，增加為正、減少為負 |
| `Amount` | Number | TWD 現金流：買入為正（含手續費），賣出為負（扣除手續費後的實收），其他類型為 0 |
| `Platform` | Select | `BitoPro`、`Bitfinex`、`Ether.fi`、`券商` |
| `Type` | Select | `買入`、`賣出`、`利息`、`轉帳`、`兌換`、`調整` |
| `GroupId` | Text | 轉帳 / 兌換的兩筆紀錄共用 |
| `OrderId` | Text | BitoPro 訂單編號，用於防止重複匯出 |

### 紀錄類型

| 類型 | 用途 | 成本處理 |
|------|------|----------|
| 買入 | 用台幣買進 | 數量與成本增加 |
| 賣出 | 賣出換回台幣 | 依平均成本扣除成本，差額計入已實現損益 |
| 利息 | 放貸利息、質押獎勵、消費回饋 | 數量增加，成本不變 |
| 轉帳 | 同一代號在平台間移動（如 BitoPro → Bitfinex） | 成本隨數量移轉，不產生損益；提領手續費使轉入數量少於轉出 |
| 兌換 | 同平台內換成另一代號（如 USDT → USD） | 成本全數帶到新代號，不產生損益 |
| 調整 | 修正數量（如鏈上 Gas 損耗、對帳差額） | 數量變動，成本不變 |

### 計算規則

- 以「代號 + 平台」為單位，依日期逐筆計算平均成本；同一天依建立時間排序，建立時間相同（Notion 只精確到分鐘）時依 買入 → 利息 → 轉帳 → 兌換 → 調整 → 賣出 排序
- 數量趨近 0 視為已結清；之後再買入會從新部位開始計算
- USD 以 USD/TWD 匯率計價；加密貨幣優先使用 BitoPro TWD 交易對價格，其次 Yahoo Finance

### 分類規則（由上往下比對）

| 條件 | 分類 |
|------|------|
| 平台為 Ether.fi | 支付（不計入總資產與配置） |
| 平台為 Bitfinex | 放貸 |
| 代號結尾為 `.TW` | 台股 |
| 平台為券商 | 美股 |
| 代號為 BTC / ETH | BTC / ETH |
| 其他 | 其他 |

### 常見記帳流程

**Bitfinex 放貸**：BitoPro 買入 USDT → 轉帳到 Bitfinex → 兌換成 USD → 每月依餘額增加記一筆利息。

**Ether.fi 支付卡**：從 BitoPro 轉帳到 Ether.fi；之後偶爾對帳，花掉的部分記「調整」（負數），回饋記「利息」。

---

## 🏗 系統架構

```
web/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 資產總覽
│   ├── ledger/page.tsx           # 記帳
│   ├── history/page.tsx          # 歷史訂單
│   ├── market/page.tsx           # 市場行情
│   ├── trading/page.tsx          # 交易下單
│   ├── settings/page.tsx         # 設定
│   ├── layout.tsx                # 全局 Layout（字體、PWA 設定）
│   ├── globals.css               # 全局樣式
│   └── api/                      # API Routes（Server-side）
│       ├── bitopro/              # BitoPro API 代理（餘額、下單、訂單、行情）
│       ├── notion/
│       │   ├── assets/           #   持倉計算結果
│       │   └── entries/          #   記帳紀錄 CRUD（[id] 為編輯 / 刪除）
│       ├── finance/
│       │   ├── stock/[symbol]/   #   股票報價（Yahoo Finance）
│       │   └── fx/               #   USD/TWD 匯率
│       └── feargreed/            # 恐懼貪婪指數
│
├── components/
│   ├── Navbar.tsx                # 頂部毛玻璃導覽列
│   ├── DashboardLayout.tsx       # 頁面 Layout 容器
│   ├── AssetPieChart.tsx         # 分類圓餅圖與分類顏色
│   ├── AssetBadges.tsx           # 資產圖示、平台標籤
│   ├── AllocationTargetsCard.tsx # 設定頁的目標配置編輯
│   └── Card / Button / Input / Select / Header / Toast
│
├── hooks/
│   ├── useCredentials.ts         # BitoPro 憑證
│   ├── useNotionCredentials.ts   # Notion 憑證
│   ├── useAllocationTargets.ts   # 目標配置
│   └── useBitoProWebSocket.ts    # WebSocket 即時訂單簿
│
├── lib/
│   ├── ledger.ts                 # 記帳核心：型別、平均成本計算、分類規則（前後端共用）
│   ├── notionLedger.ts           # Notion 讀寫（分頁查詢、欄位轉換）
│   ├── bitopro.ts                # BitoPro REST API 封裝（v3）
│   ├── financeService.ts         # 匯率與股票報價（含快取與備援來源）
│   ├── api.ts                    # 帶憑證的 fetch 工具函數
│   └── crypto.ts                 # 憑證混淆工具
│
└── scripts/
    └── migrate-ledger.mjs        # 一次性遷移：新增 Notion 欄位並回填舊資料
```

---

## 🔧 技術棧

| 類別 | 技術 |
|------|------|
| **框架** | Next.js 14 (App Router) |
| **語言** | TypeScript |
| **樣式** | Tailwind CSS 3.4 |
| **字體** | SF Pro / 蘋方（Apple 裝置），其他平台使用 Inter |
| **圖表** | Recharts |
| **交易所 API** | BitoPro REST API v3 + WebSocket |
| **記帳資料庫** | Notion API (`@notionhq/client`) |
| **匯率 / 股價** | Frankfurter、ExchangeRate-API、Yahoo Finance Chart API |
| **市場情緒** | Alternative.me Fear & Greed Index |
| **圖示** | spothq/cryptocurrency-icons（加密貨幣）、Financial Modeling Prep（公司 logo） |

---

## 🚀 快速開始

### 前置需求

- Node.js 18+
- BitoPro 帳號與 API 金鑰
- Notion Integration Token 與 Database ID（Database 需分享給該 Integration）

### 安裝與啟動

```bash
cd web
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)，到「設定」頁輸入 BitoPro 與 Notion 憑證。

### 環境變數（選用）

應用程式使用的憑證來自「設定」頁，`.env` 主要供命令列腳本使用：

```bash
cp .env.example .env
```

```env
BITOPRO_API_KEY=your_api_key_here
BITOPRO_API_SECRET=your_api_secret_here
BITOPRO_EMAIL=your_bitopro_email
NOTION_API_TOKEN=your_notion_integration_token_here
NOTION_DATABASE_ID=your_database_id_here
```

### 初始化 Notion Database

新的或舊版 Database 需先執行遷移腳本，新增 `Platform`、`Type`、`GroupId`、`OrderId` 欄位並回填既有紀錄：

```bash
cd web
node scripts/migrate-ledger.mjs           # 預覽，不寫入
node scripts/migrate-ledger.mjs --apply   # 實際寫入
```

回填規則：`.TW` 結尾或 BitoPro 無 TWD 交易對的代號歸為「券商」，其餘為「BitoPro」；數量為負記為賣出、金額為 0 記為利息、其他記為買入。

### 部署

```bash
npm run build
npm start
```

---

## 🎨 設計理念

- **Apple 風格暗色主題**：純黑背景、iOS 深色模式灰階卡片、大圓角、無邊框
- **Apple 藍強調色**：按鈕、連結與選中狀態使用 `#0071e3`
- **功能性色彩**：綠漲紅跌；平台與分類各有固定顏色，圓餅圖與目標配置表顏色一致
- **毛玻璃導覽列**：固定於頂部，捲動時透出下方內容

---

## 🔒 安全注意事項

- 切勿將 `.env` 檔案提交至版本控制
- API 金鑰請妥善保管，建議於 BitoPro 設定 IP 白名單
- 瀏覽器端儲存的憑證使用 XOR + Base64 混淆，非高安全性加密，僅防止明文暴露

---

## 📄 License

Private use only.
