import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrice } from '../utils/pricing.js';
import PaymentOptions from '../components/PaymentOptions.jsx';

const API_BASE = '';

const FREE_SHIPPING_THRESHOLD = 99900;
const PREPAID_SHIPPING = 7000;
const COD_SHIPPING = 9900;

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [step, setStep] = useState(1);

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    line1: '', line2: '', pincode: '', city: '', state: ''
  });
  const [errors, setErrors] = useState({});
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // COD state
  const [codAvailable, setCodAvailable] = useState(null);
  const [codLoading, setCodLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Pincode auto-fill (MOVE ABOVE EARLY RETURN)
  useEffect(() => {
    if (form.pincode.length === 6) {
      setPincodeLoading(true);
      fetch(`https://api.postalpincode.in/pincode/${form.pincode}`)
        .then(r => r.json())
        .then(data => {
          if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            setForm(prev => ({ ...prev, city: po.District, state: po.State }));
          }
        })
        .catch(() => {})
        .finally(() => setPincodeLoading(false));
    }
  }, [form.pincode]);

  useEffect(() => {
    const data = localStorage.getItem('frameit_cart');
    if (!data) { navigate('/'); return; }
    try { setCart(JSON.parse(data)); } catch { navigate('/'); }
  }, [navigate]);

  if (!cart) return null;

  const { size, style, thickness, price, r2Key } = cart;
  const pricePaise = (price || 0) * 100;

  // UNIVERSAL FREE PREPAID SHIPPING
  const prepaidShippingPaise = 0; 

  // If COD is blocked, give free shipping for prepaid (always free now)
  const effectivePrepaidShipping = 0;

  const getTotal = (paymentType) => {
    if (paymentType === 'cod') return pricePaise + COD_SHIPPING;
    return pricePaise + effectivePrepaidShipping;
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };


  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length !== 10) e.phone = 'Valid 10-digit number required';
    if (!form.line1.trim()) e.line1 = 'Required';
    if (!form.pincode.trim() || form.pincode.length !== 6) e.pincode = 'Valid 6-digit pincode required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.state.trim()) e.state = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validateStep1()) return;

    setCodLoading(true);
    // Track event — fire and forget
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'checkout_started' }) }).catch(() => {});
    try {
      const res = await fetch(`${API_BASE}/api/check-cod-eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone,
          pincode: form.pincode,
          order_total_paise: pricePaise
        })
      });
      const data = await res.json();
      setCodAvailable(data.cod_available);
      if (!data.cod_available) {
        setSelectedPayment('prepaid');
      }
    } catch {
      setCodAvailable(true); // On failure, don't block COD
    } finally {
      setCodLoading(false);
      setStep(2);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedPayment) return;
    setSubmitting(true);

    try {
      // Create order in Supabase
      const orderRes = await fetch(`${API_BASE}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          delivery_address: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            pincode: form.pincode
          },
          config: { size, style, thickness },
          photo_r2_key: r2Key,
          payment_type: selectedPayment
        })
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || 'Failed to create order');
      }

      const { orderId } = await orderRes.json();

      if (selectedPayment === 'cod') {
        // COD — go to confirmation page
        localStorage.setItem('frameit_order_id', orderId);
        localStorage.setItem('frameit_last_payment_type', 'cod');
        localStorage.removeItem('frameit_cart');
        navigate(`/order-confirmed?id=${orderId}`);
        return;
      }

      // Prepaid — create Razorpay order
      const rzpRes = await fetch(`${API_BASE}/api/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (!rzpRes.ok) throw new Error('Failed to create payment order');
      const rzpData = await rzpRes.json();

      // Open Razorpay checkout
      const options = {
        key: rzpData.keyId,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: 'FrameIt',
        description: `Custom Frame ${size}" ${style === 'mount' ? 'Museum Mount' : 'Direct'} ${thickness}"`,
        order_id: rzpData.razorpayOrderId,
        prefill: {
          name: form.name,
          email: form.email,
          contact: `+91${form.phone}`
        },
        theme: { color: '#4F46E5' },
        handler: function (response) {
          // Payment success
          localStorage.setItem('frameit_order_id', orderId);
          localStorage.setItem('frameit_last_payment_type', 'prepaid');
          localStorage.removeItem('frameit_cart');
          navigate(`/order-confirmed?id=${orderId}`);
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      alert(e.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      {/* Loading overlay with glass effect */}
      {(codLoading || submitting) && (
        <div className="loading-overlay">
          <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }}></div>
          <p style={{ marginTop: 24, fontSize: 18, fontWeight: 500, letterSpacing: '0.05em' }}>
            {codLoading ? 'Verifying Delivery Logistics...' : 'Securing Your Order...'}
          </p>
        </div>
      )}

      <div className="container" style={{ paddingBottom: 120 }}>
        {/* Boutique Checkout Header */}
        <header style={{ textAlign: 'center', padding: '60px 0 40px' }}>
          <div className="label-md" style={{ letterSpacing: '0.2em', opacity: 0.6 }}>Secure Checkout</div>
          <h1 className="headline-lg" style={{ marginTop: 12 }}>Delivery & Payment</h1>
          
          {/* Step Indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 32 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: step >= 1 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: '#000', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                <span style={{ fontSize: 13, fontWeight: 600, opacity: step === 1 ? 1 : 0.5 }}>Shipping</span>
             </div>
             <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: step >= 2 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: '#000', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                <span style={{ fontSize: 13, fontWeight: 600, opacity: step === 2 ? 1 : 0.5 }}>Payment</span>
             </div>
          </div>
        </header>

        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {step === 1 && (
            <div className="glass-card" style={{ padding: 40 }}>
              <h2 className="headline-sm" style={{ marginBottom: 32 }}>Shipping Information</h2>

              <div className="form-group">
                <label className="form-label">Recipient Name</label>
                <input className={`form-input ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Full name for delivery" />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <div className="phone-input-group">
                    <span className="phone-prefix">+91</span>
                    <input className={`form-input ${errors.phone ? 'error' : ''}`} type="tel" maxLength={10} value={form.phone} onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits" />
                  </div>
                  {errors.phone && <div className="form-error">{errors.phone}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className={`form-input ${errors.email ? 'error' : ''}`} type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="For order tracking" />
                  {errors.email && <div className="form-error">{errors.email}</div>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input className={`form-input ${errors.line1 ? 'error' : ''}`} value={form.line1} onChange={e => updateField('line1', e.target.value)} placeholder="Flat/House No., Building, Area" />
                {errors.line1 && <div className="form-error">{errors.line1}</div>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <div style={{ position: 'relative' }}>
                    <input className={`form-input ${errors.pincode ? 'error' : ''}`} maxLength={6} value={form.pincode} onChange={e => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="600001" />
                    {pincodeLoading && <div className="spinner" style={{ position: 'absolute', right: 12, top: 12, width: 16, height: 16, borderWidth: 2 }}></div>}
                  </div>
                  {errors.pincode && <div className="form-error">{errors.pincode}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className={`form-input ${errors.city ? 'error' : ''}`} value={form.city} onChange={e => updateField('city', e.target.value)} readOnly={!!form.city && form.pincode.length === 6} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className={`form-input ${errors.state ? 'error' : ''}`} value={form.state} onChange={e => updateField('state', e.target.value)} readOnly={!!form.state && form.pincode.length === 6} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ animation: 'slideIn 0.4s ease' }}>
              <h2 className="headline-sm" style={{ marginBottom: 24, textAlign: 'center' }}>Secure Your Order</h2>

              {/* Order summary mini */}
              <div className="glass-card" style={{ marginBottom: 32, padding: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <div>
                      <div className="label-sm" style={{ opacity: 0.5 }}>Delivering To</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>{form.name}</div>
                      <div style={{ fontSize: 13, opacity: 0.7 }}>{form.city}, {form.pincode}</div>
                   </div>
                   <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                </div>

                <div className="price-row" style={{ marginBottom: 12 }}>
                  <span style={{ opacity: 0.7 }}>{size.replace('x', '×')}” Gallery Frame</span>
                  <span>₹{price.toLocaleString('en-IN')}</span>
                </div>
                <div className="price-row" style={{ marginBottom: 24 }}>
                  <span style={{ opacity: 0.7 }}>Shipping</span>
                  <span>
                    {selectedPayment === 'cod'
                      ? `₹${(COD_SHIPPING / 100).toFixed(0)}`
                      : <span style={{ color: 'var(--success)', fontWeight: 700 }}>FREE</span>
                    }
                  </span>
                </div>
                <div className="price-row total" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
                  <span className="headline-md">Total Amount</span>
                  <span className="price-current" style={{ fontSize: '2.5rem' }}>₹{((selectedPayment ? getTotal(selectedPayment) : getTotal('prepaid')) / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <PaymentOptions
                codAvailable={codAvailable}
                selectedPayment={selectedPayment}
                onSelect={setSelectedPayment}
                shippingPrepaid={effectivePrepaidShipping}
                shippingCod={COD_SHIPPING}
              />
            </div>
          )}
        </div>
      </div>

      {/* Boutique CTA */}
      <div className="sticky-cta">
        <div className="container" style={{ maxWidth: 800 }}>
          {step === 1 ? (
            <button className="btn btn-primary btn-full" style={{ height: 64, fontSize: 18 }} onClick={handleContinue}>
              Continue to Payment
            </button>
          ) : (
            <button
              className="btn btn-primary btn-full"
              style={{ height: 72, fontSize: 20 }}
              disabled={!selectedPayment || submitting}
              onClick={handlePlaceOrder}
            >
              {selectedPayment === 'cod' ? 'Confirm COD Order' : 'Complete Secure Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
