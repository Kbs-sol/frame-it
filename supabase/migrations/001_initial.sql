-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address jsonb NOT NULL,
  config jsonb NOT NULL,
  photo_r2_key text,
  photo_thumbnail_r2_key text,
  amount integer NOT NULL,
  shipping_amount integer NOT NULL DEFAULT 0,
  payment_type text NOT NULL CHECK (payment_type IN ('prepaid', 'cod')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'paid',
    'cod_pending',
    'cod_confirmed',
    'shipped',
    'delivered',
    'rto_in_transit',
    'rto_received',
    'cancelled'
  )),
  razorpay_order_id text,
  razorpay_payment_id text,
  shiprocket_order_id text,
  awb_number text,
  shiprocket_tracking_id text,
  cod_confirm_token text,
  cod_confirm_token_expires_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_phone ON orders(customer_phone);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================================
-- CUSTOMER FLAGS TABLE (COD fraud prevention)
-- ============================================================
CREATE TABLE customer_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  rto_count integer DEFAULT 0,
  cod_blocked boolean DEFAULT false,
  cod_block_reason text,
  auto_flagged_at timestamptz,
  admin_reviewed boolean DEFAULT false,
  admin_unblocked boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- STORE SETTINGS TABLE (single row — id always = 1)
-- ============================================================
CREATE TABLE store_settings (
  id integer PRIMARY KEY DEFAULT 1,
  free_shipping_threshold integer DEFAULT 99900,
  cod_shipping_fee integer DEFAULT 9900,
  prepaid_shipping_fee integer DEFAULT 7000,
  cod_max_order_value integer DEFAULT 200000,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO store_settings (id) VALUES (1);

-- ============================================================
-- PRODUCTS TABLE — all 60 SKUs
-- ============================================================
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size text NOT NULL,
  style text NOT NULL CHECK (style IN ('direct', 'mount')),
  thickness text NOT NULL CHECK (thickness IN ('1', '1.5', '2')),
  variant_key text UNIQUE NOT NULL,
  retail_price integer NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed all 60 SKUs
INSERT INTO products (size, style, thickness, variant_key, retail_price) VALUES
('6x8','direct','1','6x8_direct_1',19900),
('6x8','direct','1.5','6x8_direct_1.5',24900),
('6x8','direct','2','6x8_direct_2',34900),
('6x8','mount','1','6x8_mount_1',24900),
('6x8','mount','1.5','6x8_mount_1.5',34900),
('6x8','mount','2','6x8_mount_2',44900),
('8x10','direct','1','8x10_direct_1',19900),
('8x10','direct','1.5','8x10_direct_1.5',34900),
('8x10','direct','2','8x10_direct_2',39900),
('8x10','mount','1','8x10_mount_1',34900),
('8x10','mount','1.5','8x10_mount_1.5',44900),
('8x10','mount','2','8x10_mount_2',49900),
('8x12','direct','1','8x12_direct_1',24900),
('8x12','direct','1.5','8x12_direct_1.5',34900),
('8x12','direct','2','8x12_direct_2',44900),
('8x12','mount','1','8x12_mount_1',34900),
('8x12','mount','1.5','8x12_mount_1.5',49900),
('8x12','mount','2','8x12_mount_2',54900),
('10x12','direct','1','10x12_direct_1',34900),
('10x12','direct','1.5','10x12_direct_1.5',44900),
('10x12','direct','2','10x12_direct_2',54900),
('10x12','mount','1','10x12_mount_1',44900),
('10x12','mount','1.5','10x12_mount_1.5',54900),
('10x12','mount','2','10x12_mount_2',64900),
('10x15','direct','1','10x15_direct_1',44900),
('10x15','direct','1.5','10x15_direct_1.5',49900),
('10x15','direct','2','10x15_direct_2',59900),
('10x15','mount','1','10x15_mount_1',54900),
('10x15','mount','1.5','10x15_mount_1.5',59900),
('10x15','mount','2','10x15_mount_2',69900),
('12x15','direct','1','12x15_direct_1',49900),
('12x15','direct','1.5','12x15_direct_1.5',54900),
('12x15','direct','2','12x15_direct_2',64900),
('12x15','mount','1','12x15_mount_1',59900),
('12x15','mount','1.5','12x15_mount_1.5',69900),
('12x15','mount','2','12x15_mount_2',79900),
('12x18','direct','1','12x18_direct_1',49900),
('12x18','direct','1.5','12x18_direct_1.5',59900),
('12x18','direct','2','12x18_direct_2',69900),
('12x18','mount','1','12x18_mount_1',64900),
('12x18','mount','1.5','12x18_mount_1.5',74900),
('12x18','mount','2','12x18_mount_2',89900),
('16x20','direct','1','16x20_direct_1',69900),
('16x20','direct','1.5','16x20_direct_1.5',84900),
('16x20','direct','2','16x20_direct_2',99900),
('16x20','mount','1','16x20_mount_1',94900),
('16x20','mount','1.5','16x20_mount_1.5',114900),
('16x20','mount','2','16x20_mount_2',129900),
('20x24','direct','1','20x24_direct_1',94900),
('20x24','direct','1.5','20x24_direct_1.5',114900),
('20x24','direct','2','20x24_direct_2',134900),
('20x24','mount','1','20x24_mount_1',129900),
('20x24','mount','1.5','20x24_mount_1.5',144900),
('20x24','mount','2','20x24_mount_2',174900),
('20x30','direct','1','20x30_direct_1',114900),
('20x30','direct','1.5','20x30_direct_1.5',154900),
('20x30','direct','2','20x30_direct_2',169900),
('20x30','mount','1','20x30_mount_1',169900),
('20x30','mount','1.5','20x30_mount_1.5',184900),
('20x30','mount','2','20x30_mount_2',259900);
