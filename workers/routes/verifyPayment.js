import { supabaseSelect, supabaseUpdate } from '../utils/supabase.js';
import { sendOrderConfirmedEmail, sendNewOrderAdminAlert } from '../utils/email.js';
import { logEvent } from '../utils/d1.js';

export async function handleVerifyPayment(request, env) {
  // This is called by Razorpay's servers (webhook), not the browser
  const rawBody = await request.text();
  const signature = request.headers.get('X-Razorpay-Signature');

  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }

  // Verify HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.RAZORPAY_KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedSig = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');

  if (computedSig !== signature) {
    console.error('Razorpay signature mismatch');
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Parse webhook payload
  const payload = JSON.parse(rawBody);
  const event = payload.event;

  // Handle payment.captured event
  if (event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const rzpOrderId = payment.order_id;
    const rzpPaymentId = payment.id;

    // Find order by razorpay_order_id
    const orders = await supabaseSelect(env, 'orders', `razorpay_order_id=eq.${rzpOrderId}&select=*&limit=1`);
    if (!orders || orders.length === 0) {
      console.error('Order not found for razorpay_order_id:', rzpOrderId);
      return new Response('OK', { status: 200 }); // Return 200 to prevent retries
    }

    const order = orders[0];

    // Update order status to paid
    await supabaseUpdate(env, 'orders', `id=eq.${order.id}`, {
      status: 'paid',
      razorpay_payment_id: rzpPaymentId
    });

    // Send emails — fire and forget
    const updatedOrder = { ...order, status: 'paid', razorpay_payment_id: rzpPaymentId };
    sendOrderConfirmedEmail(env, updatedOrder).catch(() => {});
    sendNewOrderAdminAlert(env, updatedOrder).catch(() => {});

    // Log to D1
    logEvent(env.DB, 'payment_success', order.id);
  }

  return new Response('OK', { status: 200 });
}
