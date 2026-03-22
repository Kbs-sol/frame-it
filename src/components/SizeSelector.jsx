import React, { useState } from 'react';

const PRIMARY_SIZES = ['6x8', '12x18', '16x20'];
const ALL_SIZES = ['6x8', '8x10', '8x12', '10x12', '10x15', '12x15', '12x18', '16x20', '20x24', '20x30'];

const SIZE_INFO = {
  '6x8':   { name: 'Small',        cm: '~15×20 cm' },
  '8x10':  { name: 'Medium',       cm: '~20×25 cm' },
  '8x12':  { name: 'Medium',       cm: '~20×30 cm' },
  '10x12': { name: 'Medium+',      cm: '~25×30 cm' },
  '10x15': { name: 'Large',        cm: '~25×38 cm' },
  '12x15': { name: 'Large',        cm: '~30×38 cm' },
  '12x18': { name: 'Most Popular', cm: '~30×45 cm' },
  '16x20': { name: 'Large',        cm: '~40×50 cm' },
  '20x24': { name: 'Extra Large',  cm: '~50×60 cm' },
  '20x30': { name: 'Statement',    cm: '~50×75 cm' },
};

export default function SizeSelector({ selectedSize, onSizeChange }) {
  const [showAll, setShowAll] = useState(false);

  const extraSizes = ALL_SIZES.filter(s => !PRIMARY_SIZES.includes(s));

  return (
    <>
      {/* Primary 3 sizes */}
      <div className="size-grid">
        {PRIMARY_SIZES.map(size => (
          <button
            key={size}
            className={`size-btn ${selectedSize === size ? 'active' : ''}`}
            onClick={() => onSizeChange(size)}
            style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            {size === '12x18' && <span className="badge" style={{ top: '-12px', background: 'var(--primary)', color: '#000' }}>Most Popular</span>}
            
            <span className="size-label" style={{ fontSize: '18px', marginBottom: '4px' }}>{size.replace('x', '×')}</span>
            <span className="size-name" style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px', opacity: 0.7 }}>{SIZE_INFO[size].name}</span>
          </button>
        ))}
      </div>

      {/* More sizes expander */}
      {!showAll ? (
        <button 
          className="more-sizes-btn" 
          onClick={() => setShowAll(true)}
          style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent' }}
        >
          View All Gallery Sizes →
        </button>
      ) : (
        <div className="all-sizes-grid" style={{ marginTop: '16px' }}>
          {extraSizes.map(size => (
            <button
              key={size}
              className={`size-btn ${selectedSize === size ? 'active' : ''}`}
              onClick={() => onSizeChange(size)}
              style={{ padding: '16px' }}
            >
              <span className="size-label">{size.replace('x', '×')}</span>
              <span className="size-name" style={{ fontSize: '9px', opacity: 0.6 }}>{SIZE_INFO[size].name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
