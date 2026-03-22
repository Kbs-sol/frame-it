import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleGetUploadUrl } from './routes/getUploadUrl.js';
import { handleCreateOrder } from './routes/createOrder.js';
import { handleCreateRazorpayOrder } from './routes/createRazorpayOrder.js';
import { handleVerifyPayment } from './routes/verifyPayment.js';
import { handleConfirmCod } from './routes/confirmCod.js';
import { handleCheckCodEligibility } from './routes/checkCodEligibility.js';
import { handleShipOrder } from './routes/shipOrder.js';
import { handleShiprocketWebhook } from './routes/shiprocketWebhook.js';
import { handleKeepAlive } from './routes/keepAlive.js';
import { handleAdminOrders } from './routes/admin/orders.js';
import { handleAdminPrintQueue } from './routes/admin/printQueue.js';
import { logEvent } from './utils/d1.js';

const app = new Hono();

// CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Razorpay-Signature']
}));

// Helper to pass raw request + env to handlers
function wrap(handler) {
  return async (c) => {
    const response = await handler(c.req.raw, c.env);
    return response;
  };
}

// API Routes
app.post('/api/get-upload-url', wrap(handleGetUploadUrl));
app.post('/api/create-order', wrap(handleCreateOrder));
app.post('/api/create-razorpay-order', wrap(handleCreateRazorpayOrder));
app.post('/api/verify-payment', wrap(handleVerifyPayment));
app.get('/api/confirm-cod', wrap(handleConfirmCod));
app.post('/api/check-cod-eligibility', wrap(handleCheckCodEligibility));
app.post('/api/ship-order', wrap(handleShipOrder));
app.post('/api/shiprocket-webhook', wrap(handleShiprocketWebhook));
app.get('/api/keep-alive', wrap(handleKeepAlive));
app.get('/api/admin/orders', wrap(handleAdminOrders));
app.get('/api/admin/print-queue', wrap(handleAdminPrintQueue));
app.put('/api/mock-r2-upload', (c) => c.json({ ok: true })); // Mock for local dev

// Lightweight event tracking endpoint
app.post('/api/track', async (c) => {
  const { event, session_id } = await c.req.json();
  const validEvents = ['add_to_cart', 'checkout_started', 'upload'];
  if (validEvents.includes(event) && c.env.DB) {
    logEvent(c.env.DB, event, session_id || c.req.header('CF-Connecting-IP'));
  }
  return c.json({ ok: true });
});

// SPA fallback — serve the React app for all non-API routes
const HTML_SHELL = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>FrameIt — Custom Photo Framing</title>
  <meta name="description" content="Upload your photo. Pick a frame. Get it delivered. Premium custom photo framing starting at ₹199.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://checkout.razorpay.com/v1/checkout.js" defer></script>
  <link rel="stylesheet" href="/static/app.css">
</head>
<body>
  <div id="debug-errors" style="color:red; background:#fee; font-family:monospace; padding:10px; white-space:pre-wrap; z-index:9999; position:absolute; top:0;"></div>
  <script>
    window.addEventListener('error', function(e) {
      document.getElementById('debug-errors').textContent += e.message + '\\n' + (e.error ? e.error.stack : '') + '\\n\\n';
    });
    window.addEventListener('unhandledrejection', function(e) {
      document.getElementById('debug-errors').textContent += 'Unhandled Promise Rejection: ' + e.reason + '\\n\\n';
    });
  </script>
  <div id="root"></div>
  <script type="module" src="/static/app.js"></script>
</body>
</html>`;

app.get('*', (c) => {
  const path = new URL(c.req.url).pathname;
  // Don't serve HTML for actual static files
  if (path.startsWith('/static/')) {
    return c.notFound();
  }
  // Track page visits — fire and forget
  if (c.env.DB && path === '/') {
    logEvent(c.env.DB, 'visit', c.req.header('CF-Connecting-IP'));
  }
  return c.html(HTML_SHELL);
});

// Cron handler for keep-alive
app.on('scheduled', async (event, env) => {
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/store_settings?id=eq.1&select=id`, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    });
  } catch (e) {
    console.error('Keep-alive cron failed:', e);
  }
});

export default app;
