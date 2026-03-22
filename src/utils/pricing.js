export const PRICING = {
  "6x8":   { d1:199,  d15:249,  d2:349,  m1:249,  m15:349,  m2:449  },
  "8x10":  { d1:199,  d15:349,  d2:399,  m1:349,  m15:449,  m2:499  },
  "8x12":  { d1:249,  d15:349,  d2:449,  m1:349,  m15:499,  m2:549  },
  "10x12": { d1:349,  d15:449,  d2:549,  m1:449,  m15:549,  m2:649  },
  "10x15": { d1:449,  d15:499,  d2:599,  m1:549,  m15:599,  m2:699  },
  "12x15": { d1:499,  d15:549,  d2:649,  m1:599,  m15:699,  m2:799  },
  "12x18": { d1:499,  d15:599,  d2:699,  m1:649,  m15:749,  m2:899  },
  "16x20": { d1:699,  d15:849,  d2:999,  m1:949,  m15:1149, m2:1299 },
  "20x24": { d1:949,  d15:1149, d2:1349, m1:1299, m15:1449, m2:1749 },
  "20x30": { d1:1149, d15:1549, d2:1699, m1:1699, m15:1849, m2:2599 }
};

export function getVariantKey(style, thickness) {
  const styleCode = style === 'mount' ? 'm' : 'd';
  const thicknessCode = thickness === '1' ? '1'
    : thickness === '1.5' ? '15'
    : '2';
  return `${styleCode}${thicknessCode}`;
}

export function getPrice(size, style, thickness) {
  const key = getVariantKey(style, thickness);
  return PRICING[size]?.[key] ?? null;
}

export function getAnchorPrice(retailPrice) {
  const raw = retailPrice * 1.5;
  return Math.round(raw / 49) * 49;
}

// Build Supabase variant key format: "12x18_mount_1.5"
export function getSupabaseVariantKey(size, style, thickness) {
  return `${size}_${style}_${thickness}`;
}
