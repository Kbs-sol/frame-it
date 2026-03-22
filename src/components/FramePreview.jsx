import React, { useState } from 'react';

// Aspect ratios in inches [width, height] for rendering
const SIZE_RATIO = {
  '6x8':   [6, 8],
  '8x10':  [8, 10],
  '8x12':  [8, 12],
  '10x12': [10, 12],
  '10x15': [10, 15],
  '12x15': [12, 15],
  '12x18': [12, 18],
  '16x20': [16, 20],
  '20x24': [20, 24],
  '20x30': [20, 30],
};

// Frame thickness in px for visual (base unit)
const THICKNESS_PX = { '1': 10, '1.5': 16, '2': 22 };

// Mount padding in px
const MOUNT_PX = 16;

// Scale the frame to fit within maxH
const MAX_PREVIEW_H = 400;

export default function FramePreview({ photoUrl, originalPhotoUrl, size, style, thickness }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const [w, h] = SIZE_RATIO[size] || [12, 18];
  const framePx = THICKNESS_PX[thickness] || 16;
  const mountPx = style === 'mount' ? MOUNT_PX : 0;

  // Scale photo area to fit within max height
  // Scale photo area to fit within max height
  // h is inches, * 15 to get a base px value, then scale
  const baseH = h * 25; 
  const scale = MAX_PREVIEW_H / (baseH + (framePx + mountPx) * 2);
  
  const photoW = Math.round(w * 25 * scale);
  const photoH = Math.round(h * 25 * scale);
  const frameSize = Math.round(framePx * scale);
  const mountSize = Math.round(mountPx * scale);

  const outerW = photoW + (frameSize + mountSize) * 2;
  const outerH = photoH + (frameSize + mountSize) * 2;

  const isEnhanced = originalPhotoUrl && originalPhotoUrl !== photoUrl;

  const handleMove = (clientX, rect) => {
    let newPos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, newPos)));
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX, e.currentTarget.getBoundingClientRect());
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
  };

  const renderPhotoArea = () => {
    if (!photoUrl) {
      return <div style={{ width: photoW, height: photoH, background: '#111' }} />;
    }

    const photoContent = isEnhanced ? (
      <div
        className="photo-slider-container"
        style={{ width: photoW, height: photoH, position: 'relative', overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none', touchAction: 'none' }}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        onTouchMove={handleTouchMove}
      >
        <img src={photoUrl} alt="Enhanced" style={{ width: photoW, height: photoH, objectFit: 'cover', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${sliderPos}%`, overflow: 'hidden', borderRight: '1px solid var(--primary)' }}>
          <img src={originalPhotoUrl} alt="Original" style={{ width: photoW, height: photoH, objectFit: 'cover', position: 'absolute', top: 0, left: 0, maxWidth: 'none', pointerEvents: 'none' }} />
        </div>
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>ORIGINAL</div>
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'var(--primary)', color: 'var(--on-primary)', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800 }}>ENHANCED</div>
      </div>
    ) : (
      <img src={photoUrl} alt="Your photo" className="frame-photo" style={{ width: photoW, height: photoH, pointerEvents: 'none', display: 'block' }} />
    );

    return (
      <div style={{ position: 'relative', width: photoW, height: photoH, boxShadow: 'inset 0 0 5px rgba(0,0,0,0.3)' }}>
        {photoContent}
        {/* Museum glass glare/reflection */}
        <div style={{ 
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.03) 100%)',
          mixBlendMode: 'overlay', opacity: 0.8
        }} />
      </div>
    );
  };

  return (
    <div className="frame-preview-container">
      <div className="frame-wrapper">
        <div
          className="frame-outer"
          style={{
            width: outerW,
            height: outerH,
            padding: frameSize,
            borderRadius: 2,
            background: '#0d0d0d', // Deep black/charcoal
            /* 3D Frame Lighting: Inner edge shadow, Bevel highlight, Ambient wall drop */
            boxShadow: `
              0 30px 60px -12px rgba(0,0,0,0.6), 
              0 18px 36px -18px rgba(0,0,0,0.4),
              inset 0 0 0 1px rgba(255,255,255,0.05),
              inset 0 0 ${Math.max(4, frameSize/4)}px rgba(0,0,0,0.8)
            `,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Subtle frame grain/texture overlay */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")', backgroundSize: '100px 100px' }} />

          {style === 'mount' ? (
            <div
              className="frame-mount"
              style={{
                width: photoW + mountSize * 2,
                height: photoH + mountSize * 2,
                padding: mountSize,
                background: '#f8f5f0',
                boxShadow: 'inset 0 0 8px rgba(0,0,0,0.1), 0 0 2px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {renderPhotoArea()}
            </div>
          ) : (
            renderPhotoArea()
          )}
        </div>
      </div>

      {/* Scale reference figure */}
      <div className="scale-figure">
        <svg viewBox="0 0 24 80" fill="currentColor" style={{ height: Math.min(outerH * 0.7, 80), color: '#94A3B8' }}>
          <circle cx="12" cy="8" r="6" />
          <path d="M12 16 L12 55 M4 28 L20 28 M8 55 L12 70 M16 55 L12 70" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
        <span>5'6"</span>
      </div>
    </div>
  );
}
