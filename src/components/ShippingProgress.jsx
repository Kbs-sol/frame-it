import React from 'react';

export default function ShippingProgress({ orderAmount, threshold }) {
  // orderAmount and threshold in paise
  if (orderAmount >= threshold) return null;

  const remaining = (threshold - orderAmount) / 100;
  const progress = Math.min((orderAmount / threshold) * 100, 100);

  return (
    <div className="shipping-bar">
      <span style={{ fontSize: 13, fontWeight: 600 }}>
        Add ₹{remaining.toLocaleString('en-IN')} more for <strong>free shipping</strong>
      </span>
      <div className="shipping-bar-track">
        <div className="shipping-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
