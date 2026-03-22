// Email utilities — Resend for customer emails, Brevo for admin alerts

const FROM_EMAIL = 'orders@frameit.in';
const ADMIN_EMAIL = 'admin@frameit.in';

// Short ID from UUID for display
function shortId(uuid) {
  return uuid.substring(0, 8).toUpperCase();
}

function formatAmount(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// ====== RESEND (Customer Emails) ======

async function sendResend(env, to, subject, html) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `FrameIt <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html
      })
    });
    return res.ok;
  } catch (e) {
    console.error('Resend error:', e);
    return false;
  }
}

// ====== BREVO (Admin Alerts) ======

async function sendBrevo(env, subject, html) {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'FrameIt System', email: FROM_EMAIL },
        to: [{ email: ADMIN_EMAIL }],
        subject,
        htmlContent: html
      })
    });
    return res.ok;
  } catch (e) {
    console.error('Brevo error:', e);
    return false;
  }
}

// ====== TEMPLATE: Common wrapper ======

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f8fafc; }
  .container { max-width: 600px; margin: 0 auto; padding: 24px; }
  .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .logo { font-size: 24px; font-weight: 700; color: #4F46E5; margin-bottom: 24px; }
  .btn { display: inline-block; padding: 14px 32px; background: #4F46E5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
  .summary { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .muted { color: #64748b; font-size: 13px; }
  h2 { color: #0f172a; margin: 0 0 16px; }
  p { color: #334155; line-height: 1.6; }
</style>
</head><body><div class="container"><div class="card">
  <div class="logo">FrameIt</div>
  ${content}
</div></div></body></html>`;
}

function orderSummaryHtml(order) {
  const config = typeof order.config === 'string' ? JSON.parse(order.config) : order.config;
  const addr = typeof order.delivery_address === 'string' ? JSON.parse(order.delivery_address) : order.delivery_address;
  return `<div class="summary">
    <div class="summary-row"><span>Size</span><span>${config.size}"</span></div>
    <div class="summary-row"><span>Style</span><span>${config.style === 'mount' ? 'Museum Mount' : 'Direct Frame'}</span></div>
    <div class="summary-row"><span>Thickness</span><span>${config.thickness}"</span></div>
    <div class="summary-row"><span>Amount</span><span><strong>${formatAmount(order.amount)}</strong></span></div>
    <div class="summary-row"><span>Shipping</span><span>${order.shipping_amount === 0 ? 'Free' : formatAmount(order.shipping_amount)}</span></div>
    <div class="summary-row"><span>Total</span><span><strong>${formatAmount(order.amount + order.shipping_amount)}</strong></span></div>
    <div class="summary-row"><span>Payment</span><span>${order.payment_type === 'cod' ? 'Cash on Delivery' : 'Prepaid'}</span></div>
  </div>
  <div class="summary">
    <p class="muted" style="margin:0"><strong>Delivery Address:</strong><br>
    ${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}<br>
    ${addr.city}, ${addr.state} — ${addr.pincode}</p>
  </div>`;
}

// ====== EXPORTED EMAIL FUNCTIONS ======

// Email 1: Order Confirmed (Resend → customer)
export async function sendOrderConfirmedEmail(env, order) {
  const sid = shortId(order.id);
  const html = emailWrapper(`
    <h2>Your order is confirmed! 🖼</h2>
    <p>Order <strong>#${sid}</strong> is confirmed and going into production.</p>
    ${orderSummaryHtml(order)}
    <p><strong>Estimated dispatch:</strong> within 48 hours</p>
    <p>You will receive tracking details once shipped.</p>
    <p class="muted">Custom prints are non-returnable. Exchanges only for transit damage with unboxing video at frameit.in/exchange</p>
  `);
  return sendResend(env, order.customer_email, `Your FrameIt order #${sid} is confirmed! 🖼`, html);
}

// Email 2: COD Confirmation Request (Resend → customer)
export async function sendCodConfirmationEmail(env, order, confirmUrl) {
  const sid = shortId(order.id);
  const html = emailWrapper(`
    <h2>Confirm your COD order</h2>
    <p>Your order <strong>#${sid}</strong> is reserved but not yet confirmed.</p>
    ${orderSummaryHtml(order)}
    <p style="text-align:center;margin:24px 0">
      <a href="${confirmUrl}" class="btn">Confirm My Order →</a>
    </p>
    <p class="muted">This link expires in 24 hours. If not confirmed, your order will be cancelled.</p>
    <p class="muted">If you did not place this order, ignore this email.</p>
  `);
  return sendResend(env, order.customer_email, `Action required: Confirm your FrameIt COD order #${sid}`, html);
}

// Email 3: Order Shipped (Resend → customer)
export async function sendShippedEmail(env, order, trackingUrl) {
  const sid = shortId(order.id);
  const html = emailWrapper(`
    <h2>Your memory is on its way! 📦</h2>
    <p>Order <strong>#${sid}</strong> has been shipped!</p>
    <p><strong>AWB Number:</strong> ${order.awb_number}</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${trackingUrl}" class="btn">Track Your Order →</a>
    </p>
    <p>Estimated delivery: 3-7 business days</p>
  `);
  return sendResend(env, order.customer_email, `Your memory is on its way 📦 — Track order #${sid}`, html);
}

// Email 4: COD Order Confirmed (Resend → customer, after clicking confirm link)
export async function sendCodOrderConfirmedEmail(env, order) {
  const sid = shortId(order.id);
  const html = emailWrapper(`
    <h2>Order confirmed — going into production! 🖼</h2>
    <p>Order <strong>#${sid}</strong> is confirmed and we're starting production now.</p>
    ${orderSummaryHtml(order)}
    <p><strong>Estimated dispatch:</strong> within 48 hours</p>
    <p>Payment will be collected at delivery.</p>
  `);
  return sendResend(env, order.customer_email, `Your FrameIt order #${sid} is confirmed! 🖼`, html);
}

// Admin Email 1: New Order (Brevo → admin)
export async function sendNewOrderAdminAlert(env, order) {
  const sid = shortId(order.id);
  const payType = order.payment_type === 'cod' ? 'COD' : 'PREPAID';
  const html = emailWrapper(`
    <h2>New Order Received</h2>
    <p><strong>Order #${sid}</strong> — ${payType} — ${formatAmount(order.amount + order.shipping_amount)}</p>
    <p><strong>Customer:</strong> ${order.customer_name}<br>
    <strong>Phone:</strong> ${order.customer_phone}</p>
    ${orderSummaryHtml(order)}
  `);
  return sendBrevo(env, `[FrameIt] New order #${sid} — ${payType} — ${formatAmount(order.amount)}`, html);
}

// Admin Email 2: COD Confirmed Alert (Brevo → admin)
export async function sendCodConfirmedAdminAlert(env, order) {
  const sid = shortId(order.id);
  const html = emailWrapper(`
    <h2>COD Confirmed — Ready for Production</h2>
    <p>Order <strong>#${sid}</strong> — customer confirmed COD order.</p>
    <p><strong>Customer:</strong> ${order.customer_name} (${order.customer_phone})</p>
    ${orderSummaryHtml(order)}
  `);
  return sendBrevo(env, `[FrameIt] COD Confirmed — Order #${sid} — Ready for Production`, html);
}

// Admin Email 3: RTO Alert (Brevo → admin)
export async function sendRtoAdminAlert(env, order, rtoCount, codBlocked) {
  const sid = shortId(order.id);
  const html = emailWrapper(`
    <h2>⚠️ RTO Alert</h2>
    <p>Order <strong>#${sid}</strong> has been returned to origin.</p>
    <p><strong>Customer Phone:</strong> ${order.customer_phone}<br>
    <strong>Running RTO Count:</strong> ${rtoCount}<br>
    <strong>COD Auto-Blocked:</strong> ${codBlocked ? 'Yes' : 'No'}</p>
    ${orderSummaryHtml(order)}
  `);
  return sendBrevo(env, `[FrameIt] RTO — Order #${sid} — Customer RTO count: ${rtoCount}`, html);
}
