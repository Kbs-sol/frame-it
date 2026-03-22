export const MIN_PX = {
  "6x8":   { w: 900,  h: 1200 },
  "8x10":  { w: 1200, h: 1500 },
  "8x12":  { w: 1200, h: 1800 },
  "10x12": { w: 1500, h: 1800 },
  "10x15": { w: 1500, h: 2250 },
  "12x15": { w: 1800, h: 2250 },
  "12x18": { w: 1800, h: 2700 },
  "16x20": { w: 2400, h: 3000 },
  "20x24": { w: 3000, h: 3600 },
  "20x30": { w: 3000, h: 4500 }
};

export function checkDPI(imageWidth, imageHeight, size) {
  const min = MIN_PX[size];
  if (!min) return "too_low";

  const imgLong = Math.max(imageWidth, imageHeight);
  const imgShort = Math.min(imageWidth, imageHeight);
  const minLong = Math.max(min.w, min.h);
  const minShort = Math.min(min.w, min.h);

  if (imgLong >= minLong * 2 && imgShort >= minShort * 2) return "excellent";
  if (imgLong >= minLong * 1.5 && imgShort >= minShort * 1.5) return "good";
  if (imgLong >= minLong && imgShort >= minShort) return "minimum";
  return "too_low";
}

export const DPI_BADGE = {
  excellent: { label: "Excellent Quality", color: "#10B981", canProceed: true },
  good:      { label: "Good Quality",      color: "#3B82F6", canProceed: true },
  minimum:   { label: "Minimum Quality",   color: "#F59E0B", canProceed: true },
  too_low:   { label: "Photo Too Small",   color: "#EF4444", canProceed: false }
};

export function getTooLowMessage(size) {
  const suggestions = {
    "20x30": "Try 16x20 or smaller",
    "20x24": "Try 16x20 or smaller",
    "16x20": "Try 12x18 or smaller",
    "12x18": "Try 12x15 or smaller",
    "12x15": "Try 10x12 or smaller",
  };
  return `This photo is too small for ${size}. Please upload your original photo from your camera roll — not a WhatsApp-forwarded image. ${suggestions[size] || "Try a smaller size."}`;
}
