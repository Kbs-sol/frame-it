import { supabaseSelect } from '../../utils/supabase.js';
import { verifyAdmin } from '../../utils/auth.js';
import { generatePresignedGetUrl } from '../../utils/storage.js';

export async function handleAdminPrintQueue(request, env) {
  if (!await verifyAdmin(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only orders ready for production: paid or cod_confirmed
  const orders = await supabaseSelect(
    env,
    'orders',
    'status=in.(paid,cod_confirmed)&select=*&order=created_at.asc'
  );

  // Generate signed R2 URLs for each photo
  const ordersWithPhotos = await Promise.all(
    orders.map(async (order) => {
      let photoUrl = null;
      if (order.photo_r2_key) {
        try {
          photoUrl = await generatePresignedGetUrl(env, order.photo_r2_key, 86400); // 24hr
        } catch (e) {
          console.error('Error generating signed URL for order:', order.id, e);
        }
      }
      // Strip cod_confirm_token
      const { cod_confirm_token, cod_confirm_token_expires_at, ...safeOrder } = order;
      return { ...safeOrder, photoUrl };
    })
  );

  return Response.json({ orders: ordersWithPhotos });
}
