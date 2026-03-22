import { supabaseSelect, supabaseUpdate } from '../utils/supabase.js';
import { sendCodOrderConfirmedEmail, sendCodConfirmedAdminAlert } from '../utils/email.js';

export async function handleConfirmCod(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return htmlResponse('Invalid Link', 'This confirmation link is invalid.');
  }

  // Find order by COD token
  const orders = await supabaseSelect(env, 'orders', `cod_confirm_token=eq.${token}&select=*&limit=1`);
  if (!orders || orders.length === 0) {
    return htmlResponse('Invalid Link', 'This confirmation link is invalid or has already been used.');
  }

  const order = orders[0];

  // Check expiry
  if (new Date(order.cod_confirm_token_expires_at) < new Date()) {
    return htmlResponse('Link Expired', 'This confirmation link has expired. Please place a new order.');
  }

  // Update order: status → cod_confirmed, clear token
  await supabaseUpdate(env, 'orders', `id=eq.${order.id}`, {
    status: 'cod_confirmed',
    cod_confirm_token: null,
    cod_confirm_token_expires_at: null
  });

  // Send emails — fire and forget
  const updatedOrder = { ...order, status: 'cod_confirmed' };
  sendCodOrderConfirmedEmail(env, updatedOrder).catch(() => {});
  sendCodConfirmedAdminAlert(env, updatedOrder).catch(() => {});

  // Redirect to order confirmed page
  const baseUrl = url.origin;
  return Response.redirect(`${baseUrl}/order-confirmed?id=${order.id}`, 302);
}

function htmlResponse(title, message) {
  return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — FrameIt</title>
<style>
  body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
  .card { background: #fff; padding: 48px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  h1 { color: #0f172a; margin: 0 0 12px; }
  p { color: #64748b; }
</style>
</head><body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}
