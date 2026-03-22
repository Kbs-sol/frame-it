import { supabaseSelect } from '../utils/supabase.js';

// Shiprocket token cache (in-memory, per Worker isolate)
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

  if (!res.ok) return null;

  const data = await res.json();
  shiprocketToken = data.token;
  // Cache for 8 hours (tokens last 10 days but refresh to be safe)
  shiprocketTokenExpiry = Date.now() + 8 * 60 * 60 * 1000;
  return shiprocketToken;
}

export async function handleCheckCodEligibility(request, env) {
  const body = await request.json();
  const { phone, pincode, order_total_paise } = body;

  if (!phone || !pincode || !order_total_paise) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Rule 1: Never allow COD above ₹2000
  if (order_total_paise > 200000) {
    return Response.json({ cod_available: false });
  }

  // Rule 2: Check customer_flags for COD blocks
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  try {
    const flags = await supabaseSelect(env, 'customer_flags', `phone=eq.${cleanPhone}&select=cod_blocked&limit=1`);
    if (flags && flags.length > 0 && flags[0].cod_blocked) {
      return Response.json({ cod_available: false });
    }
  } catch (e) {
    // DB failure: don't block COD
  }

  // Rule 3: Check Shiprocket serviceability
  try {
    const token = await getShiprocketToken(env);
    if (token) {
      const warehousePincode = env.WAREHOUSE_PINCODE || '110001';
      const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${warehousePincode}&delivery_postcode=${pincode}&cod=1&weight=0.5`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const couriers = data.data?.available_courier_companies || [];
        if (couriers.length === 0) {
          return Response.json({ cod_available: false });
        }
      }
    }
  } catch (e) {
    // Shiprocket API failure: never block on third-party failure
    // cod_available remains true
  }

  return Response.json({ cod_available: true });
}
