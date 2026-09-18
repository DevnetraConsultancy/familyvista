"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { uploadFileWithProgress, buildObjectPath } from "@/lib/supabase/tus-upload";
import { isImageFile } from "@/lib/utils";

const BUCKET = "images";
const MAX_CONCURRENT = 3;

export type UploadStatus = "queued" | "uploading" | "processing" | "done" | "error";

export interface UploadItem {
  id: string;
  albumId: string;
  fileName: string;
  size: number;
  /** Bytes confirmed sent to Supabase (TUS onProgress). */
  bytesUploaded: number;
  status: UploadStatus;
  error?: string;
  controller?: AbortController;
  /** Original File handle so failed uploads can be retried. */
  file: () => File;
  startedAt: number;
}

interface UploadState {
  items: UploadItem[];
  trayOpen: boolean;
  /** Bumped per album after new inserts so pages refetch. */
  revision: Record<string, number>;

  enqueue: (albumId: string, files: File[]) => number;
  retry: (id: string) => void;
  cancel: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
  setTrayOpen: (open: boolean) => void;
  _pump: () => void;
}

let seq = 0;
const nextId = () => `up_${Date.now()}_${++seq}`;

export const useUploadStore = create<UploadState>((set, get) => {
  /** Free worker slots and start the next queued upload. */
  const pump = () => {
    const { items } = get();
    const active = items.filter((i) => i.status === "uploading" || i.status === "processing")
      .length;
    let slots = MAX_CONCURRENT - active;
    if (slots <= 0) return;

    for (const item of items) {
      if (slots <= 0) break;
      if (item.status !== "queued") continue;
      slots--;
      // reserve slot synchronously to avoid double-start
      set((s) => ({
        items: s.items.map((i) =>
          i.id === item.id ? { ...i, status: "uploading" as const } : i
        ),
      }));
      void runOne(item.id);
    }
  };

  const patch = (id: string, upd: Partial<UploadItem>) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...upd } : i)),
    }));

  const runOne = async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    const supabase = createClient();
    const controller = new AbortController();
    patch(id, { controller });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!session || !user) throw new Error("Not signed in");
      const accessToken = session.access_token;

      const path = buildObjectPath(user.id, item.albumId, item.fileName);

      await uploadFileWithProgress(item.file(), path, {
        accessToken,
        onProgress: (bytes) => patch(id, { bytesUploaded: bytes }),
        signal: controller.signal,
      });

      patch(id, { status: "processing" });

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.publicUrl;
      const dims = await getImageDimensions(url).catch(() => null);

      const { error: dbErr } = await supabase.from("images").insert({
        album_id: item.albumId,
        group_id: null,
        user_id: user.id,
        file_name: item.fileName,
        original_url: url,
        thumbnail_url: url,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        file_size: item.size,
        mime_type: item.file().type || null,
        sort_order: await nextSortOrder(supabase, item.albumId),
      });
      if (dbErr) throw new Error(dbErr.message);

      patch(id, { status: "done", bytesUploaded: item.size });
      set((s) => ({
        revision: {
          ...s.revision,
          [item.albumId]: (s.revision[item.albumId] ?? 0) + 1,
        },
      }));
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      patch(id, {
        status: aborted ? "queued" : "error",
        error: aborted ? undefined : describeError(err),
      });
    } finally {
      patch(id, { controller: undefined });
      // kick the next queued item
      setTimeout(() => pump(), 0);
    }
  };

  return {
    items: [],
    trayOpen: false,
    revision: {},

    enqueue: (albumId, files) => {
      const accepted = files.filter(isImageFile);
      const fresh: UploadItem[] = accepted.map((file) => ({
        id: nextId(),
        albumId,
        fileName: file.name,
        size: file.size,
        bytesUploaded: 0,
        status: "queued" as const,
        file: () => file,
        startedAt: Date.now(),
      }));
      if (fresh.length === 0) return 0;
      set((s) => ({ items: [...s.items, ...fresh], trayOpen: true }));
      pump();
      return fresh.length;
    },

    retry: (id) => {
      patch(id, { status: "queued", error: undefined, bytesUploaded: 0 });
      pump();
    },

    cancel: (id) => {
      const item = get().items.find((i) => i.id === id);
      if (item?.status === "uploading") {
        item.controller?.abort();
      }
      // queued items can simply be removed
      if (item?.status === "queued") {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      }
    },

    dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

    clearFinished: () =>
      set((s) => ({
        items: s.items.filter((i) => i.status !== "done" && i.status !== "error"),
      })),

    setTrayOpen: (open) => set({ trayOpen: open }),
    _pump: () => pump(),
  };
});

/** Highest current sort_order in the album, so new photos append at the end. */
async function nextSortOrder(supabase: ReturnType<typeof createClient>, albumId: string) {
  const { data } = await supabase
    .from("images")
    .select("sort_order")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: false })
    .limit(1);
  return (data?.[0]?.sort_order ?? -1) + 1;
}

export function getImageDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? "Upload failed");
}
