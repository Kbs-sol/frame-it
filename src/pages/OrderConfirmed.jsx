import React from 'react';
import { useSearchParams } from 'react-router-dom';

export default function OrderConfirmed() {
  const [params] = useSearchParams();
  const orderId = params.get('id') || localStorage.getItem('frameit_order_id') || '';
  const shortId = orderId.substring(0, 8).toUpperCase();

  // Try to get cart data for display
  let cart = null;
  try {
    cart = JSON.parse(localStorage.getItem('frameit_cart') || 'null');
  } catch {}

  // Check if COD (stored from checkout flow)
  const isCod = localStorage.getItem('frameit_last_payment_type') === 'cod';

  return (
    <div className="confirmed-page">
      <div className="container">
        <div className="confirmed-check">✅</div>
        <h2 style={{ fontSize: 24, marginBottom: 8 }}>Your order is confirmed!</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: 24 }}>
          Order ID: <strong>#{shortId}</strong>
        </p>

        {cart && (
          <div className="card" style={{ textAlign: 'left', marginBottom: 24, padding: 16 }}>
            <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>
              {cart.size?.replace('x', '×')}" {cart.style === 'mount' ? 'Museum Mount' : 'Direct Frame'} · {cart.thickness}" border
            </div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>
              ₹{cart.price?.toLocaleString('en-IN')}
            </div>
          </div>
        )}

        <div className="card" style={{ textAlign: 'left', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>What happens next:</h3>
          <div className="confirmed-steps">
            <div className="confirmed-step">
              <div className="confirmed-step-num">1</div>
              <div>
                <strong>We print</strong>
                <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Your photo is printed on museum-grade paper</p>
              </div>
            </div>
            <div className="confirmed-step">
              <div className="confirmed-step-num">2</div>
              <div>
                <strong>We pack</strong>
                <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Carefully framed and securely packaged</p>
              </div>
            </div>
            <div className="confirmed-step">
              <div className="confirmed-step-num">3</div>
              <div>
                <strong>We ship within 48 hours</strong>
                <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Tracked shipping via Shiprocket</p>
              </div>
            </div>
          </div>
        </div>

        <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
          You will receive updates at your email address.
        </p>

        {isCod && (
          <div className="card" style={{ marginTop: 16, background: '#FEF3C7', border: '1px solid #F59E0B' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>
              📧 Check your email — you need to confirm your order to begin production.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
