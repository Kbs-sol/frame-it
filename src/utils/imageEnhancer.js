export async function enhanceImage(file, scaleFactor = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas disabled'));

        // Scale up the image
        canvas.width = img.naturalWidth * scaleFactor;
        canvas.height = img.naturalHeight * scaleFactor;
        
        // 1. Draw image to canvas with high-quality interpolation
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 2. APPLY SHARPEN FILTER (Canva-like effect)
        // This makes the details pop after scaling
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Simple 3x3 Sharpen Kernel
        // [ 0, -1,  0 ]
        // [-1,  5, -1 ]
        // [ 0, -1,  0 ]
        const kernel = [
          0, -1,  0,
         -1,  5, -1,
          0, -1,  0
        ];
        
        const output = new Uint8ClampedArray(data.length);
        
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) { // RGB
              let res = 0;
              for (let ky = 0; ky < 3; ky++) {
                for (let kx = 0; kx < 3; kx++) {
                  const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4 + c;
                  res += data[idx] * kernel[ky * 3 + kx];
                }
              }
              const outIdx = (y * width + x) * 4 + c;
              output[outIdx] = res;
            }
            output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3]; // Alpha
          }
        }
        
        ctx.putImageData(new ImageData(output, width, height), 0, 0);

        // Convert back to blob
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas conversion failed'));
          const newFile = new File([blob], `enhanced-${file.name}`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/jpeg', 0.92);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
