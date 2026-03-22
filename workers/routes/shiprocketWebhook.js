import { supabaseSelect, supabaseUpdate, supabaseUpsert } from '../utils/supabase.js';
import { sendRtoAdminAlert } from '../utils/email.js';

export async function handleShiprocketWebhook(request, env) {
  // Parse webhook payload
  const body = await request.json();

  // Extract event data
  const currentStatus = body.current_status || '';
  const awb = body.awb || '';

  if (!awb) {
    return new Response('OK', { status: 200 });
  }

  // Find order by AWB
  const orders = await supabaseSelect(env, 'orders', `awb_number=eq.${awb}&select=*&limit=1`);
  if (!orders || orders.length === 0) {
    return new Response('OK', { status: 200 });
  }

  const order = orders[0];

  // Handle delivery events
  const deliveredStatuses = ['Delivered', 'DELIVERED'];
  if (deliveredStatuses.includes(currentStatus)) {
    await supabaseUpdate(env, 'orders', `id=eq.${order.id}`, {
      status: 'delivered',
      delivered_at: new Date().toISOString()
    });
    return new Response('OK', { status: 200 });
  }

  // Handle RTO events
  const rtoStatuses = ['RTO Initiated', 'RTO Delivered', 'RTO_INITIATED', 'RTO_DELIVERED'];
  if (rtoStatuses.includes(currentStatus)) {
    const newStatus = currentStatus.includes('Delivered') || currentStatus.includes('DELIVERED')
      ? 'rto_received'
      : 'rto_in_transit';

    await supabaseUpdate(env, 'orders', `id=eq.${order.id}`, {
      status: newStatus
    });

    // Update customer_flags
    const cleanPhone = order.customer_phone.replace(/\D/g, '').slice(-10);

    // Check existing flag
    let rtoCount = 1;
    let codBlocked = false;

    try {
      const existing = await supabaseSelect(env, 'customer_flags', `phone=eq.${cleanPhone}&select=*&limit=1`);

      if (existing && existing.length > 0) {
        rtoCount = (existing[0].rto_count || 0) + 1;
        codBlocked = rtoCount >= 2;

        await supabaseUpdate(env, 'customer_flags', `phone=eq.${cleanPhone}`, {
          rto_count: rtoCount,
          cod_blocked: codBlocked,
          cod_block_reason: codBlocked ? 'rto_threshold' : existing[0].cod_block_reason,
          auto_flagged_at: codBlocked ? new Date().toISOString() : existing[0].auto_flagged_at,
          updated_at: new Date().toISOString()
        });
      } else {
        // Create new flag entry
        codBlocked = false; // First RTO doesn't block
        await supabaseUpsert(env, 'customer_flags', {
          phone: cleanPhone,
          rto_count: 1,
          cod_blocked: false,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('Error updating customer flags:', e);
    }

    // Send admin RTO alert
    sendRtoAdminAlert(env, order, rtoCount, codBlocked).catch(() => {});
  }

  return new Response('OK', { status: 200 });
}
