import React from "react";

const BalanceInfo = ({ usdBalance, cryptoBalance, cryptoSymbol }) => {
  return (
    <div className="balance-info">
      <div className="balance-row">
        <span className="balance-label">USD 餘額</span>
        <span className="balance-value">
          $
          {usdBalance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className="balance-row">
        <span className="balance-label">{cryptoSymbol} 餘額</span>
        <span className="balance-value">{cryptoBalance.toFixed(4)}</span>
      </div>
    </div>
  );
};

export default BalanceInfo;
