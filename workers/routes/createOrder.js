import { supabaseSelect, supabaseInsert } from '../utils/supabase.js';
import { sendCodConfirmationEmail, sendNewOrderAdminAlert } from '../utils/email.js';

export async function handleCreateOrder(request, env) {
  const body = await request.json();
  const { customer_name, customer_email, customer_phone, delivery_address, config, photo_r2_key, payment_type } = body;

  // Validate required fields
  if (!customer_name || !customer_email || !customer_phone || !delivery_address || !config || !photo_r2_key || !payment_type) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['prepaid', 'cod'].includes(payment_type)) {
    return Response.json({ error: 'Invalid payment type' }, { status: 400 });
  }

  // Look up retail price from products table — NEVER trust client price
  const variantKey = `${config.size}_${config.style}_${config.thickness}`;
  const products = await supabaseSelect(env, 'products', `variant_key=eq.${variantKey}&select=retail_price&limit=1`);

  if (!products || products.length === 0) {
    return Response.json({ error: 'Invalid product configuration' }, { status: 400 });
  }

  const retailPricePaise = products[0].retail_price;

  // Get store settings for shipping calculation
  const settings = await supabaseSelect(env, 'store_settings', 'id=eq.1&limit=1');
  const storeSettings = settings[0];

  // Calculate shipping
  let shippingPaise = 0;
  if (payment_type === 'cod') {
    shippingPaise = storeSettings.cod_shipping_fee; // ₹99
  } else {
    // Prepaid: free if above threshold, else ₹70
    shippingPaise = retailPricePaise >= storeSettings.free_shipping_threshold ? 0 : storeSettings.prepaid_shipping_fee;
  }

  const status = payment_type === 'cod' ? 'cod_pending' : 'draft';

  // For COD: generate confirmation token
  let codConfirmToken = null;
  let codConfirmTokenExpiresAt = null;
  if (payment_type === 'cod') {
    codConfirmToken = crypto.randomUUID();
    codConfirmTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  const orderData = {
    customer_name,
    customer_email,
    customer_phone: customer_phone.replace(/\D/g, '').slice(-10),
    delivery_address,
    config,
    photo_r2_key,
    amount: retailPricePaise,
    shipping_amount: shippingPaise,
    payment_type,
    status,
    cod_confirm_token: codConfirmToken,
    cod_confirm_token_expires_at: codConfirmTokenExpiresAt
  };

  const inserted = await supabaseInsert(env, 'orders', orderData);
  const order = inserted[0];

  // For COD: send confirmation email and admin alert
  if (payment_type === 'cod') {
    const baseUrl = new URL(request.url).origin;
    const confirmUrl = `${baseUrl}/api/confirm-cod?token=${codConfirmToken}`;
    // Fire and forget — don't block response
    sendCodConfirmationEmail(env, order, confirmUrl).catch(() => {});
    sendNewOrderAdminAlert(env, order).catch(() => {});
  }

  return Response.json({ orderId: order.id });
}
