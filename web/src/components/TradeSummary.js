import React from "react";
import { Segment, Header } from "semantic-ui-react";

const TradeSummary = ({ symbol, quantity, amount }) => {
  const fee = amount * 0.001; // 0.1% 手續費

  return (
    <Segment>
      <Header as="h4" style={{ marginBottom: "1rem", color: "#e2e8f0" }}>
        交易摘要
      </Header>
      <div className="summary-item">
        <span className="summary-label">交易幣種</span>
        <span className="summary-value">{symbol || "-"}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">交易數量</span>
        <span className="summary-value">
          {quantity > 0 ? quantity.toFixed(8) : "-"}
        </span>
      </div>
      <div className="summary-item">
        <span className="summary-label">手續費 (0.1%)</span>
        <span className="summary-value">${fee.toFixed(2)}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">總價值</span>
        <span className="summary-value">${amount.toFixed(2)}</span>
      </div>
    </Segment>
  );
};

export default TradeSummary;
