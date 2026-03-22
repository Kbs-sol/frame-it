# FrameIt — Custom Photo Framing Store

A direct-to-consumer custom photo framing store targeting the Indian market. Upload a photo, pick a frame, pay, and get it delivered.

## Live URLs
- **Production**: https://frameit.pages.dev
- **Configurator (main page)**: `/`
- **Cart**: `/cart`
- **Checkout**: `/checkout`
- **Order Confirmed**: `/order-confirmed`
- **Admin Orders**: `/admin/orders`
- **Admin Print Queue**: `/admin/print-queue`

## Features Implemented

### Customer-facing
- **Photo Upload** — Direct browser-to-R2 upload via presigned URLs (never through Worker)
- **Frame Configurator** — 10 sizes, 2 styles (Direct/Museum Mount), 3 thicknesses (1"/1.5"/2")
- **CSS Frame Preview** — Real-time preview with aspect ratio, mount padding, thickness scaling, human scale reference
- Fully local and zero-cost client-side **Canvas Photo Upscaling** (allowing low-res photos to pass printing thresholds securely without a backend)
- Interactive drag-and-drop sliding **Before / After** comparison for upscaled photos
- **DPI Quality Check** — Validates image resolution per size, shows quality badge (Excellent/Good/Minimum/Too Small)
- **Smart Pricing** — 60 SKU variants, anchor pricing (1.5x strike-through), instant price updates
- **Cart** — Order summary, shipping breakdown, free shipping progress bar
- **Checkout Flow** — Delivery form with pincode auto-fill, server-side COD eligibility check
- **Payment** — Razorpay (prepaid) and Cash on Delivery with confirmation email flow
- **Order Confirmation** — Post-purchase clarity page with next-steps timeline

### Admin
- **Orders Dashboard** — Filterable by status, searchable by phone/order ID, paginated
- **Print Queue** — Shows only `paid` + `cod_confirmed` orders with signed photo URLs, ship button

### Backend / Security
- **Server-side price validation** — Amount always read from Supabase products table, never from client
- **HMAC webhook verification** — Razorpay webhook signature verified before any DB write
- **COD fraud prevention** — ₹2000 cap, phone-based RTO tracking, auto-block at 2 RTOs
- **COD confirmation flow** — 24hr email token, status `cod_pending` → `cod_confirmed` only after click
- **Signed R2 URLs** — Customer photos never exposed publicly, 24hr expiry on admin URLs
- **Admin JWT auth** — Single secret token for admin endpoints

### Integrations
- **Razorpay** — Order creation, payment processing, webhook verification
- **Shiprocket** — COD serviceability check, shipment creation, tracking, RTO webhook handling
- **Resend** — Customer emails (order confirmed, COD confirmation, shipped)
- **Brevo** — Admin alerts (new order, COD confirmed, RTO)
- **Supabase** — Primary database (orders, products, customer_flags, store_settings)
- **Cloudflare D1** — Event tracking (visit, upload, add_to_cart, checkout_started, payment_success)
- **Cloudflare R2** — Photo storage with presigned upload/download URLs

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/get-upload-url` | - | Generate presigned R2 PUT URL |
| POST | `/api/create-order` | - | Create order in Supabase |
| POST | `/api/create-razorpay-order` | - | Create Razorpay payment order |
| POST | `/api/verify-payment` | Razorpay HMAC | Webhook: mark order paid |
| GET | `/api/confirm-cod` | Token in URL | Customer confirms COD order |
| POST | `/api/check-cod-eligibility` | - | Server-side COD availability check |
| POST | `/api/ship-order` | Admin JWT | Create Shiprocket shipment |
| POST | `/api/shiprocket-webhook` | - | Handle delivery/RTO events |
| GET | `/api/keep-alive` | - | Ping Supabase (cron) |
| POST | `/api/track` | - | D1 event logging |
| GET | `/api/admin/orders` | Admin JWT | List orders (filterable) |
| GET | `/api/admin/print-queue` | Admin JWT | Production-ready orders |

## Tech Stack

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| Cloudflare Pages | React frontend hosting | Unlimited |
| Cloudflare Workers (Hono) | Serverless API | 100K req/day |
| Cloudflare D1 | Event tracking (SQLite) | 5GB, 5M reads/day |
| Cloudflare R2 | Photo storage | 10GB |
| Supabase | Primary database (Postgres) | 500MB, 50K MAU |
| Resend | Customer transactional emails | 3K/month |
| Brevo | Admin alert emails | 300/day |
| Razorpay | Payments | 2% per txn |
| Shiprocket | Logistics and COD | Per shipment |

## Data Models

### Orders
60 SKU products (10 sizes × 2 styles × 3 thicknesses). All amounts in paise.

### Order Statuses
`draft` → `paid` (prepaid) or `cod_pending` → `cod_confirmed` → `shipped` → `delivered`

RTO path: `shipped` → `rto_in_transit` → `rto_received`

### Customer Flags
Phone-based COD fraud prevention. Auto-blocks after 2 RTOs.

## Setup & Deployment

### Prerequisites
1. Create a Supabase project, run `supabase/migrations/001_initial.sql`
2. Create Cloudflare D1 database: `wrangler d1 create frameit-events`
3. Create Cloudflare R2 bucket: `wrangler r2 bucket create frameit-photos`
4. Set up Razorpay, Shiprocket, Resend, Brevo accounts

### Environment Variables
Copy `.env.example` to `.dev.vars` for local development.
For production, use `wrangler secret put SECRET_NAME`.

### Local Development
```bash
npm install
npm run build
pm2 start ecosystem.config.cjs
# Access at http://localhost:3000
```

### Production Deploy
```bash
npm run build
wrangler pages deploy dist --project-name frameit
```

### CI/CD
Push to `main` branch triggers automatic deployment via GitHub Actions.

## Revenue Model
3x markup on wholesale frame prices. ₹240 wholesale → ₹749 retail. Gross margin ₹509 before shipping/print costs.

## Design System — "Atelier Noir"
- **Aesthetic**: The Digital Curator — a high-end editorial gallery experience using deep charcoal layers and metallic gold accents.
- **Color Palette**: 
  - Background: `#131313` (Deep Charcoal)
  - Primary Accent: `#f2ca50` / `#d4af37` (Metallic Gold Gradient)
  - Surfaces: Layered glassmorphism using `#1c1b1b` to `#393939` with `backdrop-filter: blur(20px)`.
- **Typography**: 
  - Display/Headlines: **Manrope** (Bold, tracking: 0.05em)
  - Body/Labels: **Inter**
- **Depth**: Ambient shadows with a 5% gold glow to simulate frame reflections.
- **No-Line Rule**: Section boundaries defined by color shifts and glass layering rather than 1px solid borders.

---
updated
**Status**: ✅ Active — Full codebase complete
**Last Updated**: 2026-03-21
