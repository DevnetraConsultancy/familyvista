"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAlbumStore, collectDescendantIds } from "@/lib/hooks/use-albums";
import type { Album, Image } from "@/lib/types";

type Supabase = ReturnType<typeof createClient>;

export interface TrashedImage extends Image {
  /** Name of the (live) album the photo belongs to, if any. */
  album_name?: string | null;
}

export function useTrash() {
  const supabase = createClient();
  const [trashedAlbums, setTrashedAlbums] = useState<Album[]>([]);
  const [trashedImages, setTrashedImages] = useState<TrashedImage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const loading = !loaded;
  const refreshAlbums = useAlbumStore((s) => s.fetchAlbums);

  /** Pure loader: no state updates, so the effect can await it safely. */
  const load = useCallback(async () => {
    const [albumsRes, imagesRes] = await Promise.all([
      supabase
        .from("albums")
        .select("*")
        .eq("is_deleted", true)
        .order("deleted_at", { ascending: false }),
      supabase
        .from("images")
        .select("*, albums(name, is_deleted)")
        .eq("is_deleted", true)
        .order("deleted_at", { ascending: false }),
    ]);

    const albums = (albumsRes.data ?? []) as Album[];
    const trashedAlbumIds = new Set(albums.map((a) => a.id));

    // Photos that went to trash *with* their album are represented by the
    // album row (restoring the album brings them back); only list photos
    // trashed individually from a live album.
    type Row = Image & { albums: { name: string; is_deleted: boolean } | null };
    const images = ((imagesRes.data ?? []) as Row[])
      .filter((img) => !trashedAlbumIds.has(img.album_id))
      .map(({ albums: a, ...img }) => ({ ...img, album_name: a?.name ?? null }));

    // Count of photos inside each trashed album (for the row label).
    const counts = new Map<string, number>();
    for (const img of (imagesRes.data ?? []) as Row[]) {
      if (trashedAlbumIds.has(img.album_id)) {
        counts.set(img.album_id, (counts.get(img.album_id) ?? 0) + 1);
      }
    }

    return {
      albums: albums.map((a) => ({ ...a, image_count: counts.get(a.id) ?? 0 })),
      images,
    };
  }, [supabase]);

  const apply = useCallback((r: { albums: Album[]; images: TrashedImage[] }) => {
    setTrashedAlbums(r.albums);
    setTrashedImages(r.images);
    setLoaded(true);
  }, []);

  const fetchTrash = useCallback(async () => {
    apply(await load());
  }, [load, apply]);

  useEffect(() => {
    let active = true;
    load().then((r) => active && apply(r));
    return () => {
      active = false;
    };
  }, [load, apply]);

  const restoreAlbum = useCallback(
    async (id: string) => {
      const { data: all } = await supabase.from("albums").select("*");
      const albums = (all ?? []) as Album[];
      const target = albums.find((a) => a.id === id);
      if (!target) return false;

      // Restore the full ancestor chain so the album is reachable again.
      const ancestors: string[] = [];
      let cur = target.parent_id;
      const seen = new Set<string>();
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        ancestors.push(cur);
        cur = albums.find((a) => a.id === cur)?.parent_id ?? null;
      }

      // Restore descendants that were trashed together with this album
      // (same deleted_at), plus their photos.
      const descendants = collectDescendantIds(albums, id).filter(
        (d) => d === id || albums.find((a) => a.id === d)?.deleted_at === target.deleted_at
      );

      if (target.deleted_at) {
        await supabase
          .from("images")
          .update({ is_deleted: false, deleted_at: null })
          .in("album_id", descendants)
          .eq("deleted_at", target.deleted_at);
      }
      const { error } = await supabase
        .from("albums")
        .update({ is_deleted: false, deleted_at: null })
        .in("id", [...descendants, ...ancestors]);
      if (!error) {
        await fetchTrash();
        refreshAlbums();
      }
      return !error;
    },
    [supabase, fetchTrash, refreshAlbums]
  );

  const restoreImages = useCallback(
    async (ids: string[]) => {
      const { error } = await supabase
        .from("images")
        .update({ is_deleted: false, deleted_at: null })
        .in("id", ids);
      if (!error) {
        await fetchTrash();
        refreshAlbums();
      }
      return !error;
    },
    [supabase, fetchTrash, refreshAlbums]
  );

  /** Permanently delete an album, its sub-albums, their photos and files. */
  const deleteAlbumForever = useCallback(
    async (id: string) => {
      const { data: all } = await supabase.from("albums").select("id, parent_id");
      const ids = collectDescendantIds((all ?? []) as Album[], id);

      const { data: images } = await supabase
        .from("images")
        .select("original_url, thumbnail_url")
        .in("album_id", ids);

      // Deleting the album cascades to rows; files are cleaned up afterwards.
      const { error } = await supabase.from("albums").delete().eq("id", id);
      if (error) return false;

      await removeOrphanedFiles(supabase, (images ?? []) as FileRefs[]);
      await fetchTrash();
      refreshAlbums();
      return true;
    },
    [supabase, fetchTrash, refreshAlbums]
  );

  const deleteImagesForever = useCallback(
    async (ids: string[]) => {
      const { data: images } = await supabase
        .from("images")
        .select("original_url, thumbnail_url")
        .in("id", ids);
      const { error } = await supabase.from("images").delete().in("id", ids);
      if (error) return false;
      await removeOrphanedFiles(supabase, (images ?? []) as FileRefs[]);
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
      const { data: trashed } = await supabase
        .from("albums")
        .select("id")
        .eq("is_deleted", true);
      const albumIds = (trashed ?? []).map((a) => a.id as string);

      // Files for: individually trashed photos + every photo inside a trashed album.
      const [{ data: imgA }, { data: imgB }] = await Promise.all([
        supabase.from("images").select("original_url, thumbnail_url").eq("is_deleted", true),
        albumIds.length
          ? supabase.from("images").select("original_url, thumbnail_url").in("album_id", albumIds)
          : Promise.resolve({ data: [] as FileRefs[] }),
      ]);

      const { error: delImgErr } = await supabase
        .from("images")
        .delete()
        .eq("is_deleted", true);
      if (delImgErr) return { ok: false, error: delImgErr.message };

      const { error: delAlbumErr } = await supabase
        .from("albums")
        .delete()
        .eq("is_deleted", true);
      if (delAlbumErr) return { ok: false, error: delAlbumErr.message };

      await removeOrphanedFiles(supabase, [
        ...((imgA ?? []) as FileRefs[]),
        ...((imgB ?? []) as FileRefs[]),
      ]);
      await fetchTrash();
      refreshAlbums();
      return { ok: true };
    },
    [supabase, fetchTrash, refreshAlbums]
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

type FileRefs = { original_url: string; thumbnail_url: string | null };

/**
 * Remove storage objects that no remaining image row references.
 * Duplicated albums/photos share the same files, so a naive delete of one
 * copy used to break the other copy's photos.
 */
async function removeOrphanedFiles(supabase: Supabase, refs: FileRefs[]) {
  const urls = new Set<string>();
  for (const r of refs) {
    if (r.original_url) urls.add(r.original_url);
    if (r.thumbnail_url && r.thumbnail_url !== r.original_url) urls.add(r.thumbnail_url);
  }
  if (urls.size === 0) return;

  const list = Array.from(urls);
  const [{ data: stillOrig }, { data: stillThumb }] = await Promise.all([
    supabase.from("images").select("original_url").in("original_url", list),
    supabase.from("images").select("thumbnail_url").in("thumbnail_url", list),
  ]);
  const referenced = new Set<string>([
    ...((stillOrig ?? []) as { original_url: string }[]).map((r) => r.original_url),
    ...((stillThumb ?? []) as { thumbnail_url: string }[]).map((r) => r.thumbnail_url),
  ]);

  const paths = list
    .filter((u) => !referenced.has(u))
    .map(extractStoragePath)
    .filter(Boolean) as string[];
  if (paths.length > 0) {
    // Supabase caps a single remove() call; batch to stay safe.
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from("images").remove(paths.slice(i, i + 100));
    }
  }
}

/** Extract `user/album/...` path from a public storage URL */
export function extractStoragePath(url: string): string | null {
  const marker = "/object/public/images/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
  } catch {
    return url.slice(idx + marker.length);
  }
}
