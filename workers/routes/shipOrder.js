import { supabaseSelect, supabaseUpdate } from '../utils/supabase.js';
import { verifyAdmin } from '../utils/auth.js';
import { sendShippedEmail } from '../utils/email.js';

const BOX_DIMENSIONS = {
  "6x8":   { length: 25, breadth: 20, height: 6,  weight: 0.4 },
  "8x10":  { length: 30, breadth: 25, height: 6,  weight: 0.5 },
  "8x12":  { length: 32, breadth: 25, height: 6,  weight: 0.6 },
  "10x12": { length: 35, breadth: 30, height: 6,  weight: 0.7 },
  "10x15": { length: 38, breadth: 30, height: 7,  weight: 0.8 },
  "12x15": { length: 40, breadth: 33, height: 7,  weight: 0.9 },
  "12x18": { length: 40, breadth: 30, height: 7,  weight: 1.0 },
  "16x20": { length: 50, breadth: 40, height: 8,  weight: 1.5 },
  "20x24": { length: 60, breadth: 50, height: 8,  weight: 2.0 },
  "20x30": { length: 65, breadth: 45, height: 8,  weight: 1.2 }
};

// Shiprocket token cache
let shiprocketToken = null;
let shiprocketTokenExpiry = 0;

async function getShiprocketToken(env) {
  if (shiprocketToken && Date.now() < shiprocketTokenExpiry) {
    return shiprocketToken;
  }
  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.SHIPROCKET_EMAIL,
      password: env.SHIPROCKET_PASSWORD
    })
  });
  if (!res.ok) throw new Error('Shiprocket auth failed');
  const data = await res.json();
  shiprocketToken = data.token;
  shiprocketTokenExpiry = Date.now() + 8 * 60 * 60 * 1000;
  return shiprocketToken;
}

export async function handleShipOrder(request, env) {
  // Verify admin
  if (!await verifyAdmin(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { orderId } = body;

  if (!orderId) {
    return Response.json({ error: 'Missing orderId' }, { status: 400 });
  }

  // Fetch order
  const orders = await supabaseSelect(env, 'orders', `id=eq.${orderId}&select=*&limit=1`);
  if (!orders || orders.length === 0) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = orders[0];
  if (!['paid', 'cod_confirmed'].includes(order.status)) {
    return Response.json({ error: 'Order is not ready for shipping' }, { status: 400 });
  }

  const config = typeof order.config === 'string' ? JSON.parse(order.config) : order.config;
  const addr = typeof order.delivery_address === 'string' ? JSON.parse(order.delivery_address) : order.delivery_address;
  const box = BOX_DIMENSIONS[config.size] || BOX_DIMENSIONS["12x18"];

  // Volumetric weight = (L × B × H) / 5000
  const volumetricWeight = (box.length * box.breadth * box.height) / 5000;
  const finalWeight = Math.max(box.weight, volumetricWeight);

  const token = await getShiprocketToken(env);

  // Create Shiprocket order
  const shiprocketPayload = {
    order_id: order.id.substring(0, 20), // Shiprocket limit
    order_date: new Date().toISOString().split('T')[0],
    pickup_location: "Primary",
    billing_customer_name: order.customer_name,
    billing_last_name: "",
    billing_address: addr.line1,
    billing_address_2: addr.line2 || "",
    billing_city: addr.city,
    billing_pincode: addr.pincode,
    billing_state: addr.state,
    billing_country: "India",
    billing_email: order.customer_email,
    billing_phone: order.customer_phone,
    shipping_is_billing: true,
    order_items: [{
      name: `Custom Frame ${config.size} ${config.style === 'mount' ? 'Museum Mount' : 'Direct'} ${config.thickness}"`,
      sku: `${config.size}_${config.style}_${config.thickness}`,
      units: 1,
      selling_price: (order.amount / 100).toFixed(2),
      discount: 0,
      tax: 0,
      hsn: 44140090 // HSN for picture frames
    }],
    payment_method: order.payment_type === 'cod' ? 'COD' : 'Prepaid',
    sub_total: ((order.amount + order.shipping_amount) / 100).toFixed(2),
    length: box.length,
    breadth: box.breadth,
    height: box.height,
    weight: finalWeight
  };

  const srRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(shiprocketPayload)
  });

  if (!srRes.ok) {
    const err = await srRes.text();
    console.error('Shiprocket create order error:', err);
    return Response.json({ error: 'Failed to create shipment' }, { status: 500 });
  }

  const srData = await srRes.json();

  // Update order in Supabase
  await supabaseUpdate(env, 'orders', `id=eq.${order.id}`, {
    status: 'shipped',
    shiprocket_order_id: String(srData.order_id || srData.shipment_id || ''),
    awb_number: srData.awb_code || srData.payload?.awb_code || '',
    shiprocket_tracking_id: String(srData.shipment_id || ''),
    shipped_at: new Date().toISOString()
  });

  const awb = srData.awb_code || srData.payload?.awb_code || '';
  const trackingUrl = `https://www.shiprocket.in/shipment-tracking/${awb}`;

  // Send shipped email
  const updatedOrder = { ...order, awb_number: awb, status: 'shipped' };
  sendShippedEmail(env, updatedOrder, trackingUrl).catch(() => {});

  return Response.json({ awbNumber: awb, trackingUrl });
}
