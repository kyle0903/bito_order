import React, { useState } from "react";
import { Icon, Form, Button, Grid, Dropdown, Input } from "semantic-ui-react";
import PriceDisplay from "./components/PriceDisplay";
import BalanceInfo from "./components/BalanceInfo";
import TradeSummary from "./components/TradeSummary";
import Notification from "./components/Notification";

// 模擬價格資料
const mockPrices = {
  BTC: { price: 43250.5 },
  ETH: { price: 2650.3 },
  BNB: { price: 315.8 },
  ADA: { price: 0.485 },
  DOT: { price: 6.24 },
  LINK: { price: 14.67 },
  LTC: { price: 72.15 },
  BCH: { price: 245.3 },
};

// 幣種選項
const coinOptions = [
  { key: "BTC", value: "BTC", text: "Bitcoin (BTC)" },
  { key: "ETH", value: "ETH", text: "Ethereum (ETH)" },
  { key: "BNB", value: "BNB", text: "Binance Coin (BNB)" },
  { key: "ADA", value: "ADA", text: "Cardano (ADA)" },
  { key: "DOT", value: "DOT", text: "Polkadot (DOT)" },
  { key: "LINK", value: "LINK", text: "Chainlink (LINK)" },
  { key: "LTC", value: "LTC", text: "Litecoin (LTC)" },
  { key: "BCH", value: "BCH", text: "Bitcoin Cash (BCH)" },
];

function App() {
  const [appState, setAppState] = useState({
    selectedCoin: "",
    tradeType: "market",
    currentPrice: 0,
    amount: "",
    quantity: "",
    limitPrice: "",
  });

  const [balances, setBalances] = useState({
    usd: 10000.0,
    crypto: 0.5,
  });

  const [notification, setNotification] = useState(null);
  const [isTrading, setIsTrading] = useState(false);

  // 選擇幣種
  const handleCoinSelect = (e, { value }) => {
    if (!value) return;

    const priceData = mockPrices[value];
    setAppState((prev) => ({
      ...prev,
      selectedCoin: value,
      currentPrice: priceData.price,
      amount: "",
      quantity: "",
      limitPrice: "",
    }));
  };

  // 切換交易類型
  const handleTradeTypeChange = (type) => {
    setAppState((prev) => ({
      ...prev,
      tradeType: type,
    }));
  };

  // 從金額計算數量
  const calculateFromAmount = (amount) => {
    if (amount > 0 && appState.currentPrice > 0) {
      const quantity = amount / appState.currentPrice;
      setAppState((prev) => ({
        ...prev,
        amount: amount.toString(),
        quantity: quantity.toFixed(8),
      }));
    } else {
      setAppState((prev) => ({
        ...prev,
        amount: amount.toString(),
        quantity: "",
      }));
    }
  };

  // 從數量計算金額
  const calculateFromQuantity = (quantity) => {
    if (quantity > 0 && appState.currentPrice > 0) {
      const amount = quantity * appState.currentPrice;
      setAppState((prev) => ({
        ...prev,
        quantity: quantity.toString(),
        amount: amount.toFixed(2),
      }));
    } else {
      setAppState((prev) => ({
        ...prev,
        quantity: quantity.toString(),
        amount: "",
      }));
    }
  };

  // 顯示通知
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 執行交易
  const executeTrade = (type) => {
    const amount = parseFloat(appState.amount) || 0;
    const quantity = parseFloat(appState.quantity) || 0;

    if (amount <= 0 || quantity <= 0) {
      showNotification("請輸入有效的金額和數量", "error");
      return;
    }

    setIsTrading(true);

    // 模擬交易執行
    setTimeout(() => {
      setIsTrading(false);
      showNotification(
        `${type === "buy" ? "買入" : "賣出"} ${quantity.toFixed(8)} ${
          appState.selectedCoin
        } 成功！`,
        "success"
      );

      // 更新餘額
      if (type === "buy") {
        setBalances((prev) => ({
          usd: prev.usd - amount,
          crypto: prev.crypto + quantity,
        }));
      } else {
        setBalances((prev) => ({
          usd: prev.usd + amount,
          crypto: prev.crypto - quantity,
        }));
      }

      // 清空輸入
      setAppState((prev) => ({
        ...prev,
        amount: "",
        quantity: "",
        limitPrice: "",
      }));
    }, 2000);
  };

  // 檢查是否可以交易
  const canTrade =
    appState.selectedCoin &&
    (parseFloat(appState.amount) > 0 || parseFloat(appState.quantity) > 0);

  return (
    <div className="main-container">
      <div className="trading-card">
        <div className="card-content">
          <h1 className="main-title">
            <Icon name="chart line" style={{ color: "#3b82f6" }} />
            Crypto Exchange
          </h1>

          {/* 幣種選擇 */}
          <Form>
            <Form.Field>
              <label>選擇交易幣種</label>
              <Dropdown
                placeholder="請選擇幣種"
                fluid
                selection
                options={coinOptions}
                value={appState.selectedCoin}
                onChange={handleCoinSelect}
              />
            </Form.Field>
          </Form>

          {/* 當前價格顯示 */}
          {appState.selectedCoin && (
            <PriceDisplay
              price={appState.currentPrice}
              symbol={appState.selectedCoin}
            />
          )}

          {/* 餘額資訊 */}
          {appState.selectedCoin && (
            <BalanceInfo
              usdBalance={balances.usd}
              cryptoBalance={balances.crypto}
              cryptoSymbol={appState.selectedCoin}
            />
          )}

          {/* 交易表單 */}
          <Form style={{ marginTop: "2rem" }}>
            <Form.Group widths="equal">
              <Form.Field>
                <label>金額 (USD)</label>
                <Input
                  type="number"
                  placeholder="$ 輸入金額"
                  value={appState.amount}
                  onChange={(e) =>
                    calculateFromAmount(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="0.01"
                />
              </Form.Field>
              <Form.Field>
                <label>數量</label>
                <div className="ui labeled quantity-input">
                  <input
                    type="number"
                    placeholder="輸入數量"
                    value={appState.quantity}
                    onChange={(e) =>
                      calculateFromQuantity(parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="0.000001"
                  />
                  <div className="ui label quantity-label">
                    {appState.selectedCoin || "BTC"}
                  </div>
                </div>
              </Form.Field>
            </Form.Group>

            {/* 交易類型選擇 */}
            <Form.Field>
              <label>交易類型</label>
              <Button.Group fluid>
                <Button
                  active={appState.tradeType === "market"}
                  onClick={() => handleTradeTypeChange("market")}
                >
                  市價交易
                </Button>
                <Button
                  active={appState.tradeType === "limit"}
                  onClick={() => handleTradeTypeChange("limit")}
                >
                  限價交易
                </Button>
              </Button.Group>
            </Form.Field>

            {/* 限價交易額外欄位 */}
            {appState.tradeType === "limit" && (
              <Form.Field>
                <label>限價 (USD)</label>
                <Input
                  type="number"
                  placeholder="$ 設定限價"
                  value={appState.limitPrice}
                  onChange={(e) =>
                    setAppState((prev) => ({
                      ...prev,
                      limitPrice: e.target.value,
                    }))
                  }
                  min="0"
                  step="0.01"
                />
              </Form.Field>
            )}

            {/* 交易摘要 */}
            {canTrade && (
              <TradeSummary
                symbol={appState.selectedCoin}
                quantity={parseFloat(appState.quantity) || 0}
                amount={parseFloat(appState.amount) || 0}
              />
            )}

            {/* 交易按鈕 */}
            <Grid columns="equal" style={{ marginTop: "2rem" }}>
              <Grid.Row>
                <Grid.Column>
                  <Button
                    massive
                    fluid
                    className="trade-button buy-button"
                    disabled={!canTrade || isTrading}
                    loading={isTrading}
                    onClick={() => executeTrade("buy")}
                  >
                    買入
                  </Button>
                </Grid.Column>
                <Grid.Column>
                  <Button
                    massive
                    fluid
                    className="trade-button sell-button"
                    disabled={!canTrade || isTrading}
                    loading={isTrading}
                    onClick={() => executeTrade("sell")}
                  >
                    賣出
                  </Button>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </Form>
        </div>
      </div>

      {/* 通知組件 */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

export default App;
