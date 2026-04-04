const MAX_WIDTH_PX = 300;
const JPEG_QUALITY = 0.75;

/**
 * Resize (max width) and compress an image in the browser via canvas.
 * Output is always JPEG at {@link JPEG_QUALITY}.
 */
export function compressImageFileForUpload(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    img.onload = () => {
      cleanup();
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w <= 0 || h <= 0) {
        reject(new Error("Invalid image dimensions"));
        return;
      }

      const scale = Math.min(1, MAX_WIDTH_PX / w);
      const outW = Math.max(1, Math.round(w * scale));
      const outH = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, outW, outH);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image compression failed"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      cleanup();
      reject(new Error("Failed to decode image"));
    };

    img.src = objectUrl;
  });
}
