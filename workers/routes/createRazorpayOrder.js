import { supabaseSelect, supabaseUpdate } from '../utils/supabase.js';

export async function handleCreateRazorpayOrder(request, env) {
  const body = await request.json();
  const { orderId } = body;

  if (!orderId) {
    return Response.json({ error: 'Missing orderId' }, { status: 400 });
  }

  // Fetch order from Supabase — amount comes from DB, never from client
  const orders = await supabaseSelect(env, 'orders', `id=eq.${orderId}&select=*&limit=1`);
  if (!orders || orders.length === 0) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = orders[0];
  if (order.status !== 'draft') {
    return Response.json({ error: 'Order is not in draft status' }, { status: 400 });
  }

  // Total in paise — read from DB
  const totalPaise = order.amount + order.shipping_amount;

  // Create Razorpay order
  const rzpAuth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${rzpAuth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: totalPaise,
      currency: 'INR',
      receipt: orderId
    })
  });

  if (!rzpRes.ok) {
    const err = await rzpRes.text();
    console.error('Razorpay error:', err);
    return Response.json({ error: 'Failed to create payment order' }, { status: 500 });
  }

  const rzpOrder = await rzpRes.json();

  // Save razorpay_order_id to Supabase
  await supabaseUpdate(env, 'orders', `id=eq.${orderId}`, {
    razorpay_order_id: rzpOrder.id
  });

  return Response.json({
    razorpayOrderId: rzpOrder.id,
    amount: totalPaise,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID
  });
}
