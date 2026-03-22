import { supabaseSelect } from '../../utils/supabase.js';
import { verifyAdmin } from '../../utils/auth.js';

export async function handleAdminOrders(request, env) {
  if (!await verifyAdmin(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const search = url.searchParams.get('search');
  const offset = (page - 1) * limit;

  let query = `select=id,customer_name,customer_email,customer_phone,config,amount,shipping_amount,payment_type,status,created_at,delivery_address,razorpay_order_id,shiprocket_order_id,awb_number&order=created_at.desc&limit=${limit}&offset=${offset}`;

  if (status && status !== 'all') {
    query += `&status=eq.${status}`;
  }

  if (search) {
    // Search by phone or order ID
    if (search.match(/^[0-9]{10}$/)) {
      query += `&customer_phone=eq.${search}`;
    } else if (search.length >= 8) {
      query += `&id=ilike.${search}*`;
    }
  }

  const orders = await supabaseSelect(env, 'orders', query);
  return Response.json({ orders, page, limit });
}
