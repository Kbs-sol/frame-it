import React from 'react';
import { getPrice, getAnchorPrice } from '../utils/pricing.js';

export default function PriceDisplay({ size, style, thickness }) {
  const price = getPrice(size, style, thickness);
  if (price === null) return null;

  const anchor = getAnchorPrice(price);

  return (
    <div className="section">
      <div className="price-display">
        <span className="price-current">₹{price.toLocaleString('en-IN')}</span>
        <span className="price-anchor">₹{anchor.toLocaleString('en-IN')}</span>
        <span className="price-badge">Launch Offer</span>
      </div>
    </div>
  );
}
