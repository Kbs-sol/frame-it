import React from 'react';

export default function PaymentOptions({ codAvailable, selectedPayment, onSelect, shippingPrepaid, shippingCod }) {
  return (
    <div className="payment-grid">
      <div
        className={`payment-card ${selectedPayment === 'prepaid' ? 'active' : ''}`}
        onClick={() => onSelect('prepaid')}
        style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Subtle premium badge */}
        <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '6px 14px', borderRadius: '0 0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Artisan Preferred</div>
        
        <div className="payment-icon" style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
        <div className="payment-name" style={{ fontSize: 16 }}>Prepaid (Safe Checkout)</div>
        <div className="payment-info" style={{ marginTop: 12 }}>
          <span className="payment-badge" style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--success)', border: '1px solid rgba(74, 222, 128, 0.2)', padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>
             FREE Express Shipping
          </span>
        </div>
      </div>

      <div
        className={`payment-card ${!codAvailable ? 'disabled' : ''} ${selectedPayment === 'cod' ? 'active' : ''}`}
        onClick={() => codAvailable && onSelect('cod')}
        style={{ border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="payment-icon" style={{ fontSize: 40, marginBottom: 16 }}>🚚</div>
        <div className="payment-name" style={{ fontSize: 16 }}>Cash on Delivery</div>
        <div className="payment-info" style={{ marginTop: 12 }}>
          {codAvailable ? (
            <div style={{ opacity: 0.6, fontSize: 13 }}>
              +₹{(shippingCod / 100).toFixed(0)} Logistics Fee
            </div>
          ) : (
            <div style={{ fontSize: '11px', opacity: 0.5, letterSpacing: '0.3px' }}>BLOCKED BY LOGISTICS PARTNER</div>
          )}
        </div>
      </div>
    </div>

  );
}
