import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '';

function getAdminToken() {
  return localStorage.getItem('frameit_admin_token') || '';
}

export default function AdminPrintQueue() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [shipping, setShipping] = useState({}); // orderId → loading state
  const token = getAdminToken();

  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/print-queue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        window.location.href = '/admin/orders';
        return;
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleShip = async (orderId) => {
    setShipping(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/ship-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to ship order');
      }

      const data = await res.json();
      // Remove from queue
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setToast(`Shipped! AWB: ${data.awbNumber}`);
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setToast(`Error: ${e.message}`);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setShipping(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const shortId = (id) => id.substring(0, 8).toUpperCase();

  if (loading) {
    return (
      <div className="admin-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: 16, color: 'var(--color-muted)' }}>Loading print queue…</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h2>Print Queue</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''} ready for production
          </p>
        </div>
        <a href="/admin/orders" className="btn btn-outline" style={{ fontSize: 13, padding: '8px 16px' }}>
          ← All Orders
        </a>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h3>All caught up!</h3>
          <p>No orders in the print queue right now.</p>
        </div>
      ) : (
        orders.map(order => {
          const config = typeof order.config === 'string' ? JSON.parse(order.config) : order.config;
          const addr = typeof order.delivery_address === 'string' ? JSON.parse(order.delivery_address) : order.delivery_address;

          return (
            <div key={order.id} className="print-card">
              <div>
                {order.photoUrl ? (
                  <img src={order.photoUrl} alt="Customer photo" className="print-photo" />
                ) : (
                  <div className="print-photo" style={{ background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>
                    No photo
                  </div>
                )}
              </div>
              <div className="print-details">
                <h4>#{shortId(order.id)}</h4>
                <p><strong>Config:</strong> {config.size}" {config.style === 'mount' ? 'Museum Mount' : 'Direct Frame'} · {config.thickness}" border</p>
                <p><strong>Customer:</strong> {order.customer_name} · {order.customer_phone}</p>
                <p><strong>Payment:</strong> {order.payment_type === 'cod' ? 'COD' : 'Prepaid'} · <span className={`status-badge status-${order.status}`}>{order.status.replace(/_/g, ' ')}</span></p>
                <p><strong>Amount:</strong> ₹{((order.amount + order.shipping_amount) / 100).toLocaleString('en-IN')}</p>

                <div className="print-address">
                  <strong>Ship to:</strong><br />
                  {order.customer_name}<br />
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                  {addr.city}, {addr.state} — {addr.pincode}<br />
                  Phone: {order.customer_phone}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ fontSize: 14, padding: '10px 20px' }}
                  disabled={shipping[order.id]}
                  onClick={() => handleShip(order.id)}
                >
                  {shipping[order.id] ? 'Shipping…' : '📦 Mark as Shipped'}
                </button>
              </div>
            </div>
          );
        })
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
