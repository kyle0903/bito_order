# A CUBE — 個人加密資產管理儀表板

> 基於 BitoPro 交易所 API 打造的個人加密貨幣資產管理與交易界面，整合 Notion 記帳、Yahoo Finance 匯率查詢，以及市場情緒指標，提供一站式的投資管理體驗。

## ✨ 功能特色

### 📊 資產總覽 (`/`)
- 即時顯示加密資產組合總市值（TWD）
- 圓餅圖呈現資產配置比例（支援市值 / 成本雙模式）
- 單一資產損益率計算與顏色標示（紅跌綠漲）
- 從 Notion Database 讀取持倉成本資料
- 金額隱藏 / 顯示切換功能
- 恐懼貪婪指數 (Fear & Greed Index) 即時顯示
- USD/TWD 匯率即時查詢（via Yahoo Finance）

### 📈 市場行情 (`/market`)
- 即時顯示主流幣種最新成交價、24h 漲跌幅、成交量
- 支援拖放排序自訂幣種顯示順序（含觸控支援）
- 排序設定自動儲存至 localStorage
- 一鍵重置為預設排序

### ⇄ 交易下單 (`/trading`)
- 支援市價單 / 限價單下單（買入 / 賣出）
- WebSocket 即時訂單簿價格串流
- 帳戶可用餘額即時查詢
- 當前掛單列表 & 一鍵取消訂單

### 📋 歷史訂單 (`/history`)
- 依幣種篩選歷史訂單（多選）
- 訂單狀態對應：掛單中、已成交、已取消等
- 批次選取訂單匯出至 Notion Database
- 自動計算成交金額與數量

### ⚙️ 設定 (`/settings`)
- BitoPro API 憑證管理（API Key / Secret / Email）
- Notion API 憑證管理（API Token / Database ID）
- 連線狀態即時驗證
- 憑證加密儲存於 localStorage（XOR + Base64）

---

## 🏗 系統架構

```
web/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 首頁 — 資產總覽
│   ├── layout.tsx                # 全局 Layout（Inter 字體、PWA 設定）
│   ├── globals.css               # 全局樣式
│   ├── market/page.tsx           # 市場行情頁
│   ├── trading/page.tsx          # 交易下單頁
│   ├── history/page.tsx          # 歷史訂單頁
│   ├── settings/page.tsx         # 設定頁
│   └── api/                      # API Routes (Server-side)
│       ├── bitopro/              # BitoPro API 代理
│       │   ├── balance/          #   帳戶餘額
│       │   ├── order/            #   建立 / 取消訂單
│       │   ├── orders/           #   查詢歷史訂單
│       │   ├── ticker/           #   單一交易對行情
│       │   └── tickers/          #   全部交易對行情
│       ├── notion/               # Notion API 代理
│       │   └── assets/           #   資產紀錄 CRUD
│       ├── yahoo/                # Yahoo Finance 代理
│       │   ├── [symbol]/         #   股票 / 幣種報價
│       │   └── fx/               #   USD/TWD 匯率
│       └── feargreed/            # 恐懼貪婪指數 API
│
├── components/                   # 共用 UI 元件
│   ├── Navbar.tsx                # 頂部導航列（含連線狀態指示）
│   ├── DashboardLayout.tsx       # 頁面 Layout 容器
│   ├── AssetPieChart.tsx         # 資產圓餅圖（Recharts）
│   ├── Card.tsx                  # 卡片元件
│   ├── Button.tsx                # 按鈕元件
│   ├── Input.tsx                 # 輸入框元件
│   ├── Select.tsx                # 下拉選單元件
│   ├── Header.tsx                # 頁面標頭元件
│   └── Toast.tsx                 # 通知提示元件
│
├── hooks/                        # 自訂 Hooks
│   ├── useCredentials.ts         # BitoPro 憑證管理
│   ├── useNotionCredentials.ts   # Notion 憑證管理
│   └── useBitoProWebSocket.ts    # WebSocket 即時訂單簿
│
└── lib/                          # 工具庫
    ├── bitopro.ts                # BitoPro REST API 封裝（v3）
    ├── api.ts                    # 帶憑證的 fetch 工具函數
    └── crypto.ts                 # 憑證加解密工具
```

---

## 🔧 技術棧

| 類別 | 技術 |
|------|------|
| **框架** | Next.js 14 (App Router) |
| **語言** | TypeScript |
| **樣式** | Tailwind CSS 3.4 |
| **字體** | Google Fonts — Inter |
| **圖表** | Recharts |
| **交易所 API** | BitoPro REST API v3 + WebSocket |
| **記帳整合** | Notion API (`@notionhq/client`) |
| **匯率查詢** | Yahoo Finance (`yahoo-finance2`) |
| **市場情緒** | Alternative.me Fear & Greed Index |

---

## 🚀 快速開始

### 前置需求

- Node.js 18+
- BitoPro 帳號 & API 金鑰（[申請教學](https://www.bitopro.com/))
- （選用）Notion Integration Token & Database ID

### 安裝

```bash
cd web
npm install
```

### 環境變數

```bash
cp .env.example .env
```

編輯 `.env` 填入您的 API 憑證：

```env
# BitoPro API
BITOPRO_API_KEY=your_api_key_here
BITOPRO_API_SECRET=your_api_secret_here

# Notion API（可選）
NOTION_API_TOKEN=your_notion_integration_token_here
NOTION_DATABASE_ID=your_database_id_here
```

> **備註**：您也可以直接在應用程式的「設定」頁面中輸入 API 憑證，無需設定 `.env` 檔案。憑證會以加密方式儲存在瀏覽器的 localStorage 中。

### 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000)

### 部署

```bash
npm run build
npm start
```

---

## 🔌 外部 API 整合

### BitoPro API v3
- **私有 API**（需認證）：帳戶餘額、下單、訂單查詢、取消訂單
- **公開 API**：交易對行情、訂單簿、成交紀錄
- **WebSocket**：即時訂單簿數據串流（`wss://stream.bitopro.com`）
- 認證方式：HMAC-SHA384 簽章

### Notion API
- 讀取 Notion Database 中的持倉紀錄（Target / Quantity / Amount / Date）
- 從歷史訂單頁批次新增成交紀錄至 Notion

### Yahoo Finance
- 查詢 USD/TWD 即時匯率
- 查詢個別標的報價

### Alternative.me
- 加密貨幣恐懼貪婪指數（1 小時快取）

---

## 🎨 設計理念

- **工具導向**：為有交易經驗的使用者打造，強調效率與資訊密度
- **暗色主題**：低飽和度中性色系，專業金融工具質感
- **功能性色彩**：僅在漲跌方向、連線狀態等功能性場景使用顏色
- **克制動效**：減少多餘動畫，營造理性、可靠的長期投資工具氛圍

---

## 🔒 安全注意事項

- 切勿將 `.env` 檔案提交至版本控制
- API 金鑰請妥善保管
- 建議於 BitoPro 設定 IP 白名單
- 瀏覽器端儲存的憑證使用 XOR + Base64 混淆，非高安全性加密，僅防止明文暴露

---

## 📄 License

Private use only.
