import React from 'react';
import { checkDPI, DPI_BADGE, getTooLowMessage } from '../utils/dpi.js';

export default function DPIBadge({ imageWidth, imageHeight, size }) {
  if (!imageWidth || !imageHeight) return null;

  const quality = checkDPI(imageWidth, imageHeight, size);
  const badge = DPI_BADGE[quality];

  return (
    <div>
      <div className="dpi-badge" style={{ background: badge.color + '15', color: badge.color }}>
        <span style={{ fontSize: 16 }}>{quality === 'excellent' ? '✨' : quality === 'good' ? '👍' : quality === 'minimum' ? '⚠️' : '❌'}</span>
        {badge.label}
      </div>
      {quality === 'too_low' && (
        <div className="dpi-error">{getTooLowMessage(size)}</div>
      )}
    </div>
  );
}
