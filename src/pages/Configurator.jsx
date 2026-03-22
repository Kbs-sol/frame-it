import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FramePreview from '../components/FramePreview.jsx';
import SizeSelector from '../components/SizeSelector.jsx';
import DPIBadge from '../components/DPIBadge.jsx';
import PriceDisplay from '../components/PriceDisplay.jsx';
import { getPrice } from '../utils/pricing.js';
import { checkDPI, DPI_BADGE } from '../utils/dpi.js';
import { enhanceImage } from '../utils/imageEnhancer.js';

const API_BASE = '';

export default function Configurator() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Config state — defaults are highest-margin
  const [size, setSize] = useState('12x18');
  const [style, setStyle] = useState('mount');
  const [thickness, setThickness] = useState('1.5');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Photo state
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ w: 0, h: 0 });
  const [r2Key, setR2Key] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState(null);
  const [enhanceCount, setEnhanceCount] = useState(0);

  // Compute DPI status
  const dpiStatus = imageDimensions.w > 0 ? checkDPI(imageDimensions.w, imageDimensions.h, size) : null;
  const [sizeW, sizeH] = size.split('x').map(Number);
  const dpi = imageDimensions.w > 0 ? Math.min(imageDimensions.w / sizeW, imageDimensions.h / sizeH) : 0;
  
  const canProceed = dpiStatus ? DPI_BADGE[dpiStatus].canProceed : false;
  const isUploaded = !!r2Key;
  const price = getPrice(size, style, thickness);

  const handleFileSelect = useCallback(async (file, isEnhance = false) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a JPG or PNG image');
      return;
    }

    setUploadError(null);

    // Read image dimensions
    const url = URL.createObjectURL(file);
    if (!isEnhance) {
      setOriginalPhotoUrl(url);
      setEnhanceCount(0);
    }

    const img = new Image();
    img.onload = async () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setImageDimensions({ w, h });

      // Check DPI for current size
      const quality = checkDPI(w, h, size);
      if (quality === 'too_low') {
        setPhotoUrl(url);
        setPhotoFile(file);
        return; // Don't upload, show error
      }

      // Good enough — start upload
      setPhotoUrl(url);
      setPhotoFile(file);
      await uploadToR2(file);
    };
    img.src = url;
  }, [size, isEnhance => null]); // isEnhance doesn't need to be in deps, but size does

  const uploadToR2 = async (file) => {
    setUploading(true);
    setUploadProgress(10);

    try {
      // Get presigned URL
      const res = await fetch(`${API_BASE}/api/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }

      const { uploadUrl, r2Key: key } = await res.json();
      setUploadProgress(30);

      // Direct PUT to R2
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(30 + Math.round((e.loaded / e.total) * 60));
        }
      });

      await new Promise((resolve, reject) => {
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      setUploadProgress(100);
      setR2Key(key);

      // Log upload event
      fetch(`${API_BASE}/api/get-upload-url`, { method: 'OPTIONS' }).catch(() => {});
    } catch (e) {
      setUploadError(e.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true);
    setUploadError(null);
    try {
      const enhancedFile = await enhanceImage(photoFile, 2);
      setEnhanceCount(c => c + 1);
      await handleFileSelect(enhancedFile, true);
    } catch (e) {
      setUploadError("Enhancement failed: " + e.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSizeChange = useCallback((newSize) => {
    setSize(newSize);
    // Re-check DPI if photo already loaded
    if (imageDimensions.w > 0) {
      const quality = checkDPI(imageDimensions.w, imageDimensions.h, newSize);
      if (quality === 'too_low' && r2Key) {
        // Photo already uploaded but too small for new size — warn but don't clear
      }
      // If photo wasn't uploaded yet due to previous too_low and now it's ok, upload it
      if (quality !== 'too_low' && photoFile && !r2Key && !uploading) {
        uploadToR2(photoFile);
      }
    }
  }, [imageDimensions, r2Key, photoFile, uploading]);

  const handleAddToCart = () => {
    // Track event — fire and forget
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'add_to_cart' }) }).catch(() => {});
    
    // For local dev, if R2 upload fails but we have a photo, allow proceeding with a mock key
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const effectiveR2Key = r2Key || (isLocal ? `local-mock-${Date.now()}.jpg` : null);

    const cartData = {
      size, style, thickness,
      price,
      photoUrl,
      r2Key: effectiveR2Key,
      imageDimensions
    };
    localStorage.setItem('frameit_cart', JSON.stringify(cartData));
    navigate('/cart');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const priceDiff = style === 'direct' ? (() => {
    const mountPrice = getPrice(size, 'mount', thickness);
    return mountPrice ? mountPrice - price : 0;
  })() : 0;

  return (
    <div className="page-content">
      <div className="container" style={{ paddingBottom: 120 }}>
        {/* Editorial Hero Section */}
        <header className="hero-section" style={{ textAlign: 'center', paddingTop: 60, marginBottom: 80 }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(242,202,80,0.1)', color: 'var(--primary)',
            padding: '6px 16px', borderRadius: '100px', fontSize: '11px', 
            fontWeight: 800, letterSpacing: '0.1em', marginBottom: 24, 
            textTransform: 'uppercase', border: '1px solid rgba(242,202,80,0.2)'
          }}>
            <span style={{ fontSize: '14px' }}>✨</span> The Artisan's Choice
          </div>
          <h1 className="display-lg" style={{ marginBottom: 24 }}>
            Frame Your Moments.<br />
            <span style={{ color: 'var(--primary)' }}>Curate Your Life.</span>
          </h1>
          <p className="body-lg" style={{ maxWidth: 600, margin: '0 auto', fontSize: '1.2rem', opacity: 0.8 }}>
            Museum-grade materials meets digital precision. We transform your photos into timeless gallery artifacts.
          </p>
        </header>

        {/* Main Interface: Side-by-Side on Desktop */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: photoUrl ? 'minmax(0, 1.2fr) 1fr' : '1fr', 
          gap: 60, 
          alignItems: 'start' 
        }}>
          
          {/* Left Side: Upload or Preview */}
          <div style={{ position: photoUrl ? 'sticky' : 'static', top: 100 }}>
            {!photoUrl ? (
              <div className="section">
                <div
                  className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <div className="icon">📸</div>
                  <h3>Begin Your Creation</h3>
                  <p>Drop your original high-resolution photo here</p>
                  <div style={{ marginTop: 24, opacity: 0.5, fontSize: '12px', letterSpacing: '0.05em' }}>
                    JPG · PNG · HEIC SUPPORTED
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                </div>
                {uploadError && <div className="dpi-error" style={{ marginTop: 16, textAlign: 'center' }}>{uploadError}</div>}
              </div>
            ) : (
              <div className="preview-panel">
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="label-md">Gallery Preview</span>
                    <DPIBadge dpi={dpi} status={dpiStatus} />
                  </div>
                  
                  <FramePreview photoUrl={photoUrl} originalPhotoUrl={originalPhotoUrl} size={size} style={style} thickness={thickness} />
                  
                  {uploading && (
                    <div className="progress-bar" style={{ borderRadius: 0, marginTop: 0 }}>
                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}

                  <div className="photo-toolbar">
                    <div className="photo-toolbar-left">
                      {!isEnhancing && !uploading && photoUrl && (
                        <button 
                          onClick={handleEnhance} 
                          className="btn-enhance"
                        >
                          {enhanceCount > 0 ? `🚀 Enhanced (${enhanceCount + 1}×)` : '✨ Enhance Photo'}
                        </button>
                      )}
                      {isEnhancing && <span className="enhancing-label" style={{ padding: '8px 0' }}>🔬 Refinement in progress...</span>}
                    </div>
                    <button
                      className="btn-change-photo"
                      onClick={() => {
                        setPhotoUrl(null);
                        setOriginalPhotoUrl(null);
                        setEnhanceCount(0);
                        setPhotoFile(null);
                        setR2Key(null);
                        setImageDimensions({ w: 0, h: 0 });
                        setUploadProgress(0);
                      }}
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
                
                {/* Scale Figure Placeholder (if needed, simplified) */}
                <div style={{ marginTop: 20, textAlign: 'center', opacity: 0.4, fontSize: '11px', letterSpacing: '1px' }}>
                   SCAILED FOR {size}" DIMENSIONS
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Options (Only visible if photo uploaded) */}
          {photoUrl && (
            <div className="options-panel">
              {/* Section 1: Size */}
              <div className="section">
                <div className="section-title">1. Select Dimensions</div>
                <SizeSelector selectedSize={size} onSizeChange={handleSizeChange} />
              </div>

              {/* Section 2: Stylization */}
              <div className="section">
                <div className="section-title">2. Choose Your Style</div>
                <div className="style-grid">
                  <div 
                    className={`style-card ${style === 'mount' ? 'active' : ''}`} 
                    onClick={() => setStyle('mount')}
                  >
                    <div className="style-icon">🖼️</div>
                    <div className="style-name">Museum Mount</div>
                    <div className="style-desc">Traditional white matting for an elegant gallery look.</div>
                  </div>
                  <div 
                    className={`style-card ${style === 'direct' ? 'active' : ''}`} 
                    onClick={() => setStyle('direct')}
                  >
                    <div className="style-icon">👁️</div>
                    <div className="style-name">Direct Frame</div>
                    <div className="style-desc">Edge-to-edge printing for a modern, bold statement.</div>
                  </div>
                </div>
              </div>

              {/* Section 3: Depth */}
              <div className="section">
                <div className="section-title">3. Frame Depth (Inches)</div>
                <div className="thickness-toggle">
                  {['1', '1.5', '2'].map(t => (
                    <button 
                      key={t} 
                      className={`thickness-btn ${thickness === t ? 'active' : ''}`} 
                      onClick={() => setThickness(t)}
                    >
                      {t}" Depth
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 4: Investment Summary */}
              <div className="section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 32 }}>
                <PriceDisplay size={size} style={style} thickness={thickness} />
                
                {price < 999 && (
                  <div style={{ marginTop: 24, padding: '20px', background: 'rgba(28,27,27,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ opacity: 0.7 }}>📦 Free Shipping Target</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>₹{(999 - price)} remaining</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.min((price / 999) * 100, 100)}%`, 
                        background: 'linear-gradient(90deg, var(--primary), var(--primary-container))', 
                        borderRadius: 10,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Add to Cart Button */}
              <div style={{ marginTop: 40 }}>
                <button
                  className="btn btn-primary btn-full"
                  style={{ height: 64, fontSize: '18px' }}
                  disabled={( !r2Key && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ) || !canProceed}
                  onClick={handleAddToCart}
                >
                  Add to Shopping Bag
                </button>
                <div style={{ textAlign: 'center', marginTop: 16, opacity: 0.5, fontSize: '12px' }}>
                  Secure Checkout powered by Razorpay
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Boutique Trust Section */}
        <div style={{ marginTop: 120, textAlign: 'center' }}>
          <h2 className="headline-md" style={{ marginBottom: 40 }}>Crafted with Obsession</h2>
          <div className="trust-badges" style={{ marginBottom: 60 }}>
            <div className="trust-badge"><span className="emoji">🔒</span> 256-bit Secure</div>
            <div className="trust-badge"><span className="emoji">🇮🇳</span> Made in India</div>
            <div className="trust-badge"><span className="emoji">📦</span> Eco-Friendly</div>
            <div className="trust-badge"><span className="emoji">✨</span> 100% Satisfaction</div>
          </div>
          <p className="exchange-notice" style={{ maxWidth: 500, margin: '0 auto' }}>
            As each piece is custom-made to your precision, we cannot offer returns. We do provide full replacements for any transit issues.
          </p>
        </div>
      </div>
    </div>
  );
}
