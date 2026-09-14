"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Album, Image } from "@/lib/types";

export function useTrash() {
  const supabase = createClient();
  const [trashedAlbums, setTrashedAlbums] = useState<Album[]>([]);
  const [trashedImages, setTrashedImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    const [albumsRes, imagesRes] = await Promise.all([
      supabase
        .from("albums")
        .select("*")
        .eq("is_deleted", true)
        .order("deleted_at", { ascending: false }),
      supabase
        .from("images")
        .select("*")
        .eq("is_deleted", true)
        .order("deleted_at", { ascending: false }),
    ]);
    if (albumsRes.data) setTrashedAlbums(albumsRes.data);
    if (imagesRes.data) setTrashedImages(imagesRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const restoreAlbum = useCallback(
    async (id: string) => {
      // restore parent chain too
      const { data: album } = await supabase
        .from("albums")
        .select("parent_id")
        .eq("id", id)
        .single();
      if (album?.parent_id) {
        await supabase
          .from("albums")
          .update({ is_deleted: false, deleted_at: null })
          .eq("id", album.parent_id);
      }
      const { error } = await supabase
        .from("albums")
        .update({ is_deleted: false, deleted_at: null })
        .eq("id", id);
      if (!error) await fetchTrash();
      return !error;
    },
    [supabase, fetchTrash]
  );

  const restoreImages = useCallback(
    async (ids: string[]) => {
      const { error } = await supabase
        .from("images")
        .update({ is_deleted: false, deleted_at: null })
        .in("id", ids);
      if (!error) await fetchTrash();
      return !error;
    },
    [supabase, fetchTrash]
  );

  /** Permanently delete album + its images + storage files */
  const deleteAlbumForever = useCallback(
    async (id: string) => {
      // gather images to remove from storage
      const { data: images } = await supabase
        .from("images")
        .select("original_url")
        .eq("album_id", id);

      const { error: imgErr } = await supabase
        .from("images")
        .delete()
        .eq("album_id", id);
      if (imgErr) return false;

      // storage cleanup: derive path from public URL
      const paths = (images ?? [])
        .map((img) => extractStoragePath(img.original_url))
        .filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("images").remove(paths);
      }

      const { error: albumErr } = await supabase
        .from("albums")
        .delete()
        .eq("id", id);
      if (!albumErr) await fetchTrash();
      return !albumErr;
    },
    [supabase, fetchTrash]
  );

  const deleteImagesForever = useCallback(
    async (ids: string[]) => {
      const { data: images } = await supabase
        .from("images")
        .select("original_url")
        .in("id", ids);
      const { error } = await supabase.from("images").delete().in("id", ids);
      if (error) return false;

      const paths = (images ?? [])
        .map((img) => extractStoragePath(img.original_url))
        .filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("images").remove(paths);
      }
      await fetchTrash();
      return true;
    },
    [supabase, fetchTrash]
  );

  /** Empty entire trash — phrase must equal DELETE ALL */
  const emptyTrash = useCallback(
    async (phrase: string): Promise<{ ok: boolean; error?: string }> => {
      if (phrase.trim().toUpperCase() !== "DELETE ALL") {
        return { ok: false, error: "Phrase does not match" };
      }
      // storage cleanup for all trashed images
      const { data: images } = await supabase
        .from("images")
        .select("original_url")
        .eq("is_deleted", true);

      const { error: delImgErr } = await supabase
        .from("images")
      .delete()
        .eq("is_deleted", true);
      if (delImgErr) return { ok: false, error: delImgErr.message };

      const paths = (images ?? [])
        .map((img) => extractStoragePath(img.original_url))
        .filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("images").remove(paths);
      }

      const { error: delAlbumErr } = await supabase
        .from("albums")
        .delete()
        .eq("is_deleted", true);
      if (delAlbumErr) return { ok: false, error: delAlbumErr.message };

      await fetchTrash();
      return { ok: true };
    },
    [supabase, fetchTrash]
  );

  return {
    trashedAlbums,
    trashedImages,
    loading,
    refetch: fetchTrash,
    restoreAlbum,
    restoreImages,
    deleteAlbumForever,
    deleteImagesForever,
    emptyTrash,
  };
}

/** Extract `user/album/...` path from a public storage URL */
function extractStoragePath(url: string): string | null {
  try {
    const marker = "/object/public/images/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  } catch {
    return null;
  }
}
