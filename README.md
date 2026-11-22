# A CUBE — 個人投資資產管理儀表板

> 以 BitoPro 交易所 API 為基礎、Notion 作為記帳資料庫的個人投資管理介面。支援 BitoPro、Bitfinex 放貸、Ether.fi 支付卡與券商（台股 / 美股）等多平台記帳，以平均成本法計算持倉與已實現損益，並對照目標配置協助再平衡。

## ✨ 功能特色

### 📊 資產總覽 (`/`)
- 即時顯示投資組合總市值（TWD / USD）與 24h 加權漲跌
- 損益拆分為**未實現**（目前持有）與**已實現**（已賣出與股利）兩個數字
- 資產列表以「代號 + 平台」為單位，附幣種 / 公司圖示與彩色平台標籤
- 依分類（台股、美股、BTC、ETH、放貸、其他）的現值圓餅圖
- **目標配置對照**：目標 %、目前 %、偏離、調整至目標需買賣的金額（偏離 ±5% 內視為正常）
- 已結清部位收合顯示各自的已實現損益（例如全部賣出的 ADA）
- **放貸（Bitfinex）**收合區塊：每筆借出資金的金額、年利率、期間與剩餘天數，已借出 / 掛單中 / 閒置資金，本月至今利息，以及 USD 年化（放貸本身）與 TWD 年化（含匯差）
- 支付用途資產（Ether.fi）獨立收合顯示，不計入總資產與配置
- 金額隱藏 / 顯示切換、USD/TWD 匯率、恐懼貪婪指數
- 累計績效摘要：整體年化報酬（XIRR）、累計總損益與淨值迷你走勢，點擊進入績效頁

### ↗ 績效 (`/performance`)
- 從帳本與每日收盤價**重建歷史淨值**，與累計淨投入畫在同一張走勢圖
- 目前淨值、累計淨投入、總損益、整體 **XIRR**（資金加權年化報酬）
- 各分類（台股、美股、BTC、ETH、放貸、其他）的現值、淨投入、損益與 XIRR；持有未滿一年會標示僅供參考

### ✎ 記帳 (`/ledger`)
- 新增買入、賣出、利息、股利、轉帳、兌換、調整七種紀錄
- 轉帳與兌換一次產生轉出、轉入兩筆，並以 GroupId 綁定
- 台股買賣輸入股數與成交單價即自動算出實付 / 實收（手續費 0.1425% × 設定頁折數，整股最低 20 元、零股 1 元；賣出另計證交稅，股票 0.3%、00 開頭 ETF 0.1%），金額仍可手動修正
- 依平台、代號、類型篩選紀錄
- 編輯與刪除（刪除為 Notion 封存，可從垃圾桶復原；成組紀錄會一起處理）

### ⇣ 匯入 (`/import`)

**BitoPro 訂單**
- 依幣種、狀態篩選 BitoPro 歷史訂單
- 批次匯出成交紀錄至 Notion，自動帶入平台、類型、手續費與訂單編號
- 已匯出的訂單會標示「已匯出」，不會重複匯出

**Bitfinex 利息**
- 列出 2026-12 起每個已結束月份（台灣時間）的放貸利息，一鍵寫入為該月最後一天的「利息」紀錄
- 已寫入的月份標示「已同步」，以 `OrderId = BFX-INT-YYYY-MM` 防止重複

### ⇄ BitoPro (`/bitopro`)

以頁籤切換「行情」與「交易」。

**行情**
- 主流幣種最新成交價、24h 漲跌幅、成交量
- 拖放排序自訂顯示順序（含觸控支援），設定儲存於 localStorage

**交易**
- 市價單 / 限價單下單（買入 / 賣出）
- WebSocket 即時訂單簿價格串流
- 可用餘額查詢、當前掛單列表與一鍵取消

### ⚙️ 設定 (`/settings`)
- BitoPro API 憑證（API Key / Secret / Email）、Notion API 憑證（Token / Database ID）與 Bitfinex 唯讀 API 憑證（Key / Secret），含連線驗證
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
| `Amount` | Number | TWD 現金流：買入為正（含手續費），賣出、股利為負（扣除手續費 / 預扣稅後的實收），其他類型為 0 |
| `Platform` | Select | `BitoPro`、`Bitfinex`、`Ether.fi`、`券商` |
| `Type` | Select | `買入`、`賣出`、`利息`、`股利`、`轉帳`、`兌換`、`調整` |
| `GroupId` | Text | 轉帳 / 兌換的兩筆紀錄共用 |
| `OrderId` | Text | BitoPro 訂單編號，用於防止重複匯出 |

### 紀錄類型

| 類型 | 用途 | 成本處理 |
|------|------|----------|
| 買入 | 用台幣買進 | 數量與成本增加 |
| 賣出 | 賣出換回台幣 | 依平均成本扣除成本，差額計入已實現損益 |
| 利息 | 放貸利息、質押獎勵、消費回饋、股票股利（配股） | 數量增加，成本不變 |
| 股利 | 現金股利：掛在該股票代號下，金額為實收（美股扣除預扣稅），不填數量 | 數量與成本不變，實收計入已實現損益 |
| 轉帳 | 同一代號在平台間移動（如 BitoPro → Bitfinex） | 成本隨數量移轉，不產生損益；提領手續費使轉入數量少於轉出 |
| 兌換 | 同平台內換成另一代號（如 USDT → USD） | 成本全數帶到新代號，不產生損益 |
| 調整 | 修正數量（如鏈上 Gas 損耗、對帳差額） | 數量變動，成本不變 |

### 計算規則

- 以「代號 + 平台」為單位，依日期逐筆計算平均成本；同一天依建立時間排序，建立時間相同（Notion 只精確到分鐘）時依 買入 → 利息 → 股利 → 轉帳 → 兌換 → 調整 → 賣出 排序
- 數量趨近 0 視為已結清；之後再買入會從新部位開始計算
- USD 以 USD/TWD 匯率計價；加密貨幣優先使用 BitoPro TWD 交易對價格，其次 Yahoo Finance

### 績效計算（`/performance`）

- **現金流**（投資人角度，投入為負、取回為正）：買入、賣出、股利為 `-Amount`；利息與調整不是現金流，屬於報酬
- **跨分類移轉**：轉帳 / 兌換的兩端分類不同時（如 BitoPro USDT → Bitfinex），以轉入端當日市值，記為來源分類取回、目的分類投入；整體績效中兩者抵銷
- **支付分類視為投資組合之外**：轉去 Ether.fi 等同以當日市值提領，累計淨投入隨之減少
- **累計淨投入** = 整體現金流加總取負；**XIRR** 以各筆現金流加上今日市值（視為全部取回）計算
- **放貸 USD 年化**：只看 Bitfinex 平台上的數量（USD / USDT 視為 1:1），跨平台轉入為投入、轉出為取回，利息為報酬；與放貸分類 TWD 年化的差距即匯率影響
- **歷史價格**皆為未還原的實際成交價：台股用 FinMind（Yahoo 的台股價格已分割還原卻沒有分割事件）、美股與加密貨幣用 Yahoo 日線（依分割事件還原），以 USD/TWD 日線換算；快取 6 小時

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

**Bitfinex 放貸**：BitoPro 買入 USDT → 轉帳到 Bitfinex → 兌換成 USD → 每月記一筆利息。2026-12 起的月份到「匯入 → Bitfinex 利息」一鍵寫入（從 API 加總該月利息，記在月底，`OrderId = BFX-INT-YYYY-MM` 防重複）；之前的月份沿用手動紀錄。

Bitfinex API Key 請建立**唯讀**金鑰，只開啟 Wallets、Margin Funding、Account History 的讀取權限。

**台股**：平台選「券商」、代號如 `0050.TW`，填股數與成交單價，金額自動帶入（記折扣後的實際成本，不管隔月退佣的時間差）。

**複委託（美股）**：台幣交割，直接照對帳單填實際扣款 / 入帳的台幣金額。

**Ether.fi 支付卡**：從 BitoPro 轉帳到 Ether.fi；之後偶爾對帳，花掉的部分記「調整」（負數），回饋記「利息」。

---

## 🏗 系統架構

```
web/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 資產總覽
│   ├── performance/page.tsx      # 績效（淨值走勢、XIRR）
│   ├── ledger/page.tsx           # 記帳
│   ├── import/page.tsx           # 匯入（BitoPro 訂單 / Bitfinex 利息頁籤）
│   ├── bitopro/page.tsx          # BitoPro（行情 / 交易頁籤）
│   ├── settings/page.tsx         # 設定
│   ├── layout.tsx                # 全局 Layout（字體、PWA 設定）
│   ├── globals.css               # 全局樣式
│   └── api/                      # API Routes（Server-side）
│       ├── bitfinex/
│       │   ├── summary/          #   放貸現況（錢包、借出、掛單、本月利息）
│       │   └── interest/         #   各月份利息總和
│       ├── notion/
│       │   ├── assets/           #   持倉計算結果
│       │   └── entries/          #   記帳紀錄 CRUD（[id] 為編輯 / 刪除）
│       ├── performance/          # 帳本重建的淨值走勢與 XIRR
│       ├── finance/
│       │   ├── stock/[symbol]/   #   股票報價（Yahoo Finance）
│       │   └── fx/               #   USD/TWD 匯率
│       └── feargreed/            # 恐懼貪婪指數
│
├── components/
│   ├── Navbar.tsx                # 頂部毛玻璃導覽列
│   ├── DashboardLayout.tsx       # 頁面 Layout 容器
│   ├── AssetPieChart.tsx         # 分類圓餅圖與分類顏色
│   ├── PerformanceChart.tsx      # 淨值 vs 累計淨投入走勢圖（含迷你版）
│   ├── AssetBadges.tsx           # 資產圖示、平台標籤
│   ├── MarketPanel.tsx           # BitoPro 行情（TWD 交易對、拖放排序）
│   ├── TradingPanel.tsx          # BitoPro 下單、餘額、掛單
│   ├── BitoProImportPanel.tsx    # BitoPro 歷史訂單匯出至 Notion
│   ├── BitfinexInterestPanel.tsx # Bitfinex 月利息同步
│   ├── LendingCard.tsx           # 總覽頁的放貸區塊
│   ├── BitfinexSettingsCard.tsx  # 設定頁的 Bitfinex 憑證
│   ├── AllocationTargetsCard.tsx # 設定頁的目標配置編輯
│   ├── TwFeeDiscountCard.tsx     # 設定頁的台股手續費折數
│   └── Card / Button / Input / Select / Header / Toast
│
├── hooks/
│   ├── useCredentials.ts         # BitoPro 憑證
│   ├── useNotionCredentials.ts   # Notion 憑證
│   ├── useBitfinexCredentials.ts # Bitfinex 憑證
│   ├── useAllocationTargets.ts   # 目標配置
│   ├── useTwFeeDiscount.ts       # 台股手續費折數
│   ├── usePerformance.ts         # 績效資料
│   └── useBitoProWebSocket.ts    # WebSocket 即時訂單簿
│
├── lib/
│   ├── ledger.ts                 # 記帳核心：型別、平均成本計算、分類規則（前後端共用）
│   ├── notionLedger.ts           # Notion 讀寫（分頁查詢、欄位轉換）
│   ├── twStockFee.ts             # 台股手續費與證交稅計算
│   ├── performance.ts            # 績效核心：每日淨值重建、現金流、XIRR
│   ├── priceHistory.ts           # 歷史日線價格（FinMind / Yahoo，未還原價）
│   ├── bitoproClient.ts          # BitoPro REST API v3 瀏覽器端用戶端（直接呼叫，簽章在瀏覽器內計算）
│   ├── bitfinex.ts               # Bitfinex REST API v2 封裝（唯讀：錢包、放貸、利息）
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
| **交易所 API** | BitoPro REST API v3 + WebSocket、Bitfinex REST API v2（唯讀） |
| **記帳資料庫** | Notion API (`@notionhq/client`) |
| **匯率 / 股價** | Frankfurter、ExchangeRate-API、Yahoo Finance Chart API、FinMind（台股歷史價） |
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
- API 金鑰請妥善保管，BitoPro 金鑰建議不開啟提領權限
- 瀏覽器端儲存的憑證使用 XOR + Base64 混淆，非高安全性加密，僅防止明文暴露
- BitoPro API 由瀏覽器直接呼叫，不經過伺服器：BitoPro 會擋雲端機房（Vercel / AWS）的 IP，從使用者自己的網路呼叫則正常；API Secret 只在瀏覽器內計算簽章，不會送出。因為呼叫來源是當下的網路，不適合設定 IP 白名單；開啟國外 VPN 時也可能被擋

---

## 📄 License

Private use only.
