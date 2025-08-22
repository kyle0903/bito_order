import React from "react";

const PriceDisplay = ({ price, symbol }) => {
  return (
    <div className="price-display">
      <div className="price-value">
        $
        {price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })}
      </div>
      <div className="price-label">當前價格 USD</div>
    </div>
  );
};

export default PriceDisplay;
