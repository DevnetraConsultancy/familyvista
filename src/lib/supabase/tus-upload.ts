"use client";

import * as tus from "tus-js-client";

const BUCKET = "images";
/** Supabase recommends ~6MB chunks for TUS uploads. */
const CHUNK_SIZE = 6 * 1024 * 1024;
const RETRY_DELAYS = [0, 1000, 3000, 5000];

export interface TusUploadOptions {
  /** Valid access token for the signed-in user (falls back to the anon key). */
  accessToken: string;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
  signal?: AbortSignal;
}

/**
 * Upload a file to Supabase Storage via the TUS resumable endpoint.
 *
 * Unlike the standard `storage.upload()`, the TUS protocol emits real
 * byte-level progress events (like MEGA / Google Drive) and retries
 * failed chunks automatically.
 *
 * @param file  the File to upload
 * @param path  object path inside the bucket, e.g. `${userId}/${albumId}/123_photo.jpg`
 */
export function uploadFileWithProgress(
  file: File,
  path: string,
  { accessToken, onProgress, signal }: TusUploadOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      reject(new Error("Supabase is not configured (missing env vars)"));
      return;
    }

    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`,
      retryDelays: RETRY_DELAYS,
      chunkSize: CHUNK_SIZE,
      uploadSize: file.size,
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "31536000",
      },
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) =>
        onProgress?.(bytesUploaded, bytesTotal),
      onSuccess: () => resolve(),
    });

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Upload aborted", "AbortError"));
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          try {
            upload.abort();
          } catch {
            /* already finished */
          }
          reject(new DOMException("Upload aborted", "AbortError"));
        },
        { once: true }
      );
    }

    upload.start();
  });
}

/**
 * Build the object path used by both the TUS upload and the public URL.
 * Mirrors the layout the app already uses: `${userId}/${albumId}/${ts}_${rand}_${safeName}`.
 */
export function buildObjectPath(
  userId: string,
  albumId: string,
  fileName: string
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${albumId}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}_${safe}`;
}
