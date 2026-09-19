"use client";

/**
 * Pre-upload photo compression — squeeze as hard as possible without visible
 * quality loss, keeping each file's original format.
 *
 * - JPEG → decode via <img> + mozjpeg re-encode at quality 90 (typically
 *   20–40% smaller, visually identical; EXIF incl. GPS is dropped).
 * - PNG  → oxipng lossless optimisation (pixel-identical, 15–40% smaller).
 * - Everything else (WebP, GIF, AVIF, HEIC…) passes through untouched —
 *   already compressed, animated, or not browser-decodable.
 *
 * The codec WASM binaries are served from /public/wasm and passed to the
 * codecs' init() explicitly — they stay out of the bundler graph, which keeps
 * production builds fast and the runtime download lazy (first JPEG/PNG upload
 * only, ~250–420 KB gzipped).
 *
 * Safety rule enforced in `optimizeForUpload`: the result is only used when it
 * is actually SMALLER than the original, and any codec error falls back to the
 * original file. Optimization can never make an upload bigger or fail it.
 */

/** Mozjpeg quality — high enough to be visually indistinguishable. */
const JPEG_QUALITY = 90;
/** oxipng effort level — 3 is the Squoosh default (good ratio, reasonable time). */
const PNG_LEVEL = 3;

export interface OptimizeResult {
  blob: Blob;
  /** True when the returned blob is a smaller, optimized version of the input. */
  optimized: boolean;
}

function isJpeg(file: File): boolean {
  return file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
}

function isPng(file: File): boolean {
  return file.type === "image/png" || /\.png$/i.test(file.name);
}

/** Decode any browser-supported image to raw pixels via an <img> element. */
async function decodeToImageData(blob: Blob): Promise<ImageData> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

let jpegReady: Promise<unknown> | null = null;
function initJpeg() {
  // `init` is exported from the submodule, not the package root.
  jpegReady ??= import("@jsquash/jpeg/encode.js").then((m) =>
    m.init({ locateFile: () => "/wasm/mozjpeg_enc.wasm" })
  );
  return jpegReady;
}

let pngReady: Promise<unknown> | null = null;
function initPng() {
  pngReady ??= import("@jsquash/oxipng/optimise.js").then((m) =>
    m.init("/wasm/squoosh_oxipng_bg.wasm")
  );
  return pngReady;
}

async function optimizeJpeg(file: File): Promise<Blob> {
  // Lazy-load the WASM codec only when a JPEG actually needs optimizing.
  // encode.js exports `init` (named) and `encode` (default).
  const [{ default: encode }, imageData] = await Promise.all([
    initJpeg().then(() => import("@jsquash/jpeg/encode.js")),
    decodeToImageData(file),
  ]);
  const encoded = await encode(imageData, { quality: JPEG_QUALITY });
  return new Blob([encoded], { type: "image/jpeg" });
}

async function optimizePng(file: File): Promise<Blob> {
  // oxipng rewrites the PNG structure losslessly — no decode/re-encode needed.
  // optimise.js exports `init` (named) and `optimise` (default).
  const { default: optimise } = await initPng().then(() =>
    import("@jsquash/oxipng/optimise.js")
  );
  const buffer = await file.arrayBuffer();
  const out = await optimise(buffer, { level: PNG_LEVEL, interlace: false });
  return new Blob([out], { type: "image/png" });
}

/**
 * Compress `file` for upload. Returns the smaller of {original, optimized};
 * never throws — on any failure the original file is returned unchanged.
 */
export async function optimizeForUpload(file: File): Promise<OptimizeResult> {
  try {
    if (typeof window === "undefined") return { blob: file, optimized: false };

    let candidate: Blob | null = null;
    if (isJpeg(file)) candidate = await optimizeJpeg(file);
    else if (isPng(file)) candidate = await optimizePng(file);

    if (candidate && candidate.size > 0 && candidate.size < file.size) {
      return { blob: candidate, optimized: true };
    }
    return { blob: file, optimized: false };
  } catch {
    // Codec unavailable, decode failure, OOM… — original wins, upload proceeds.
    return { blob: file, optimized: false };
  }
}
