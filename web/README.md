# 加密貨幣交易平台 (React Version)

這是一個使用 React + Semantic UI React 構建的加密貨幣交易平台前端介面。

## 功能特色

- 🪙 支援多種加密貨幣交易 (BTC, ETH, BNB, ADA, DOT, LINK, LTC, BCH)
- 💰 即時價格顯示
- 📊 餘額管理
- 🔄 市價/限價交易
- 📱 響應式設計
- 🎨 現代化 UI 設計

## 技術棧

- **前端框架**: React 18
- **UI 庫**: Semantic UI React
- **樣式**: CSS + Semantic UI CSS
- **構建工具**: Create React App

## 安裝與運行

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動開發伺服器

```bash
npm start
```

應用將在 `http://localhost:3000` 啟動。

### 3. 構建生產版本

```bash
npm run build
```

## 專案結構

```
src/
├── components/           # React 組件
│   ├── PriceDisplay.js  # 價格顯示組件
│   ├── BalanceInfo.js   # 餘額資訊組件
│   ├── TradeSummary.js  # 交易摘要組件
│   └── Notification.js  # 通知組件
├── App.js               # 主應用組件
├── index.js             # 應用入口
└── index.css            # 全域樣式
```

## 組件說明

### App.js

- 主要應用邏輯
- 狀態管理 (selectedCoin, tradeType, balances, etc.)
- 交易功能實現

### PriceDisplay.js

- 顯示所選加密貨幣的當前價格
- 格式化價格顯示

### BalanceInfo.js

- 顯示 USD 和加密貨幣餘額
- 支援動態更新

### TradeSummary.js

- 顯示交易摘要資訊
- 計算手續費和總價值

### Notification.js

- 顯示成功/錯誤通知
- 自動消失功能

## 主要功能

### 1. 幣種選擇

- 支援 8 種主流加密貨幣
- 即時價格更新

### 2. 交易功能

- 市價交易：按當前市價立即執行
- 限價交易：設定目標價格執行

### 3. 數量計算

- 金額 ↔ 數量 雙向自動計算
- 支援精確到小數點後 8 位

### 4. 餘額管理

- 即時更新 USD 和加密貨幣餘額
- 交易後自動調整餘額

## 樣式特色

- 深色主題設計
- 漸層背景和邊框
- 自訂一體成型的輸入框設計
- 響應式佈局
- 流暢的動畫效果

## 開發說明

這個專案從原本的 HTML + jQuery 版本轉換而來，主要改進：

1. **現代化架構**: 使用 React hooks 進行狀態管理
2. **組件化設計**: 將 UI 拆分為可複用的組件
3. **更好的維護性**: 清晰的檔案結構和組件分離
4. **TypeScript 友好**: 可輕鬆遷移到 TypeScript

## 後續開發

- [ ] 加入 TypeScript 支援
- [ ] 實作真實 API 串接
- [ ] 加入圖表顯示
- [ ] 加入交易歷史紀錄
- [ ] 實作 WebSocket 即時價格更新
