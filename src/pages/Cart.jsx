import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPrice } from '../utils/pricing.js';
import ShippingProgress from '../components/ShippingProgress.jsx';

const FREE_SHIPPING_THRESHOLD = 99900; // paise
const PREPAID_SHIPPING = 7000; // paise
const COD_SHIPPING = 9900; // paise

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);

  useEffect(() => {
    const data = localStorage.getItem('frameit_cart');
    if (!data) {
      navigate('/');
      return;
    }
    try {
      setCart(JSON.parse(data));
    } catch {
      navigate('/');
    }
  }, [navigate]);

  if (!cart) return null;

  const { size, style, thickness, price, photoUrl, r2Key } = cart;
  const pricePaise = (price || 0) * 100;
  const isFreeShipping = pricePaise >= FREE_SHIPPING_THRESHOLD;
  
  // UNIVERSAL FREE PREPAID SHIPPING
  const prepaidShipping = 0; 
  const styleName = style === 'mount' ? 'Museum Mount' : 'Direct Frame';

  return (
    <div className="page-content">
      <div className="container" style={{ paddingBottom: 120 }}>
        {/* Boutique Cart Header */}
        <header style={{ textAlign: 'center', padding: '60px 0 40px' }}>
          <div className="label-md" style={{ letterSpacing: '0.2em', opacity: 0.6 }}>Shopping Bag</div>
          <h1 className="headline-lg" style={{ marginTop: 12 }}>Review Your Order</h1>
        </header>

        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Item Card */}
          <div className="glass-card" style={{ marginBottom: 32, padding: 32 }}>
            <div className="cart-item" style={{ background: 'transparent', padding: 0, gap: 32 }}>
              {photoUrl && (
                <div style={{ position: 'relative' }}>
                  <img src={photoUrl} alt="Your photo" className="cart-thumb" style={{ width: 120, height: 160, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} />
                  <div style={{ position: 'absolute', top: -10, left: -10, background: 'var(--primary)', color: '#000', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800 }}>PICKED</div>
                </div>
              )}
              <div className="cart-details" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 className="headline-md" style={{ marginBottom: 8, fontSize: '1.5rem' }}>Custom Gallery Frame</h3>
                <div className="cart-config" style={{ fontSize: '16px', opacity: 0.8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: 'var(--primary)' }}>{size.replace('x', '×')}”</span>
                  <span>•</span>
                  <span>{styleName}</span>
                  <span>•</span>
                  <span>{thickness}” Depth</span>
                </div>
                <div style={{ marginTop: 24 }}>
                   <Link to="/" className="btn-tertiary" style={{ padding: 0, opacity: 0.6, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Edit Configuration
                  </Link>
                </div>
              </div>
              <div style={{ alignSelf: 'center', textAlign: 'right' }}>
                <div className="price-current" style={{ fontSize: '1.75rem' }}>₹{price.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Subtotal & Free Shipping */}
          <div className="glass-card" style={{ padding: 32, marginBottom: 40 }}>
            <div className="price-row" style={{ fontSize: '16px', marginBottom: 12 }}>
              <span style={{ opacity: 0.7 }}>Premium Crafting & Print</span>
              <span>₹{price.toLocaleString('en-IN')}</span>
            </div>
            <div className="price-row" style={{ fontSize: '16px', marginBottom: 24 }}>
              <span style={{ opacity: 0.7 }}>Gallery Shipping (Online)</span>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>FREE</span>
            </div>
            
            <div className="price-row total" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24 }}>
              <span className="headline-md">Grand Total</span>
              <span className="price-current" style={{ fontSize: '2.5rem' }}>₹{price.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Shipping incentive */}
          {!isFreeShipping && (
            <div style={{ marginBottom: 40 }}>
              <ShippingProgress orderAmount={pricePaise} threshold={FREE_SHIPPING_THRESHOLD} />
            </div>
          )}

          {/* Checkout CTA */}
          <div style={{ textAlign: 'center' }}>
            <button
              className="btn btn-primary btn-full"
              style={{ height: 72, fontSize: '20px', maxWidth: 400, margin: '0 auto' }}
              onClick={() => navigate('/checkout')}
            >
              Continue to Delivery
            </button>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 24, opacity: 0.4, fontSize: '12px' }}>
               <span>🔒 Secured Checkout</span>
               <span>✨ 100% Quality Assurance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
