/* MHD Hospital — client-side image compression (no Firebase Storage in the
 * original app; images are stored as base64 dataURLs inside Firestore docs).
 * Ported from js/app.js compressImage() + profile-photo cropper. */

export function compressImage(file: File, maxChars = 550000, hardLimit = 700000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const attempts: [number, number][] = [[1200, 0.6], [900, 0.5], [700, 0.45], [500, 0.4], [380, 0.35]];
        const cv = document.createElement('canvas');
        const ctx = cv.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        for (const [maxW, q] of attempts) {
          const scale = Math.min(1, maxW / img.width);
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          const data = cv.toDataURL('image/jpeg', q);
          if (data.length < maxChars) { resolve(data); return; }
        }
        const last = cv.toDataURL('image/jpeg', 0.35);
        if (last.length >= hardLimit) reject(new Error('Image is too large. Try a smaller file.'));
        else resolve(last);
      };
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/** 180×180 square center-crop for profile photos. */
export function cropPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 180;
        const cv = document.createElement('canvas');
        cv.width = S;
        cv.height = S;
        const ctx = cv.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
        resolve(cv.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}
