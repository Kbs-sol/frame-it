import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '';
const STATUS_FILTERS = ['all', 'draft', 'paid', 'cod_pending', 'cod_confirmed', 'shipped', 'delivered'];

function getAdminToken() {
  return localStorage.getItem('frameit_admin_token') || '';
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [token, setToken] = useState(getAdminToken());
  const [showLogin, setShowLogin] = useState(!getAdminToken());

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status !== 'all') params.set('status', status);
      if (search) params.set('search', search);

      const res = await fetch(`${API_BASE}/api/admin/orders?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        setShowLogin(true);
        return;
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, status, search, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleLogin = (e) => {
    e.preventDefault();
    const input = e.target.elements.token.value;
    localStorage.setItem('frameit_admin_token', input);
    setToken(input);
    setShowLogin(false);
  };

  if (showLogin) {
    return (
      <div className="admin-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div className="card" style={{ maxWidth: 400, width: '100%' }}>
          <h2 style={{ marginBottom: 16 }}>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Admin Token</label>
              <input className="form-input" name="token" type="password" placeholder="Enter admin token" />
            </div>
            <button className="btn btn-primary btn-full" type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const shortId = (id) => id.substring(0, 8).toUpperCase();

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Orders</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="admin-search"
            placeholder="Search phone or order ID"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrders()}
          />
          <a href="/admin/print-queue" className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>
            Print Queue
          </a>
        </div>
      </div>

      <div className="admin-filters">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            className={`filter-btn ${status === s ? 'active' : ''}`}
            onClick={() => { setStatus(s); setPage(1); }}
          >
            {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : (
        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Config</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const config = typeof order.config === 'string' ? JSON.parse(order.config) : order.config;
                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>#{shortId(order.id)}</td>
                    <td>{order.customer_name}</td>
                    <td>{order.customer_phone}</td>
                    <td style={{ fontSize: 12 }}>{config.size}" {config.style === 'mount' ? 'Mount' : 'Direct'} {config.thickness}"</td>
                    <td>₹{(order.amount / 100).toLocaleString('en-IN')}</td>
                    <td>{order.payment_type === 'cod' ? 'COD' : 'Prepaid'}</td>
                    <td><span className={`status-badge status-${order.status}`}>{order.status.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontSize: 12 }}>{formatDate(order.created_at)}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-muted)' }}>No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {orders.length === 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <button className="btn btn-outline" onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
