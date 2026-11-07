"use client";

/** Longest edge of generated grid thumbnails. */
export const THUMB_MAX = 720;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sizeOf(src: ImageBitmap | HTMLImageElement) {
  return "naturalWidth" in src
    ? { width: src.naturalWidth, height: src.naturalHeight }
    : { width: src.width, height: src.height };
}

/** Pixel dimensions of a local image file (EXIF orientation applied). */
export async function readImageDimensions(file: Blob) {
  const src = await decode(file);
  const dims = sizeOf(src);
  if ("close" in src) src.close();
  return dims;
}

/**
 * Downscale to a WebP thumbnail (≤ THUMB_MAX px on the long edge).
 * Returns null when the browser cannot decode the file (e.g. HEIC in Chrome),
 * in which case callers fall back to the original URL.
 */
export async function makeThumbnail(file: Blob): Promise<Blob | null> {
  const src = await decode(file);
  const { width, height } = sizeOf(src);
  if (!width || !height) return null;

  const scale = Math.min(1, THUMB_MAX / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  if ("close" in src) src.close();

  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", 0.82)
  );
}
