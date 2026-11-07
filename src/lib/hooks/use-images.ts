"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUploadStore } from "@/lib/upload-store";
import { useAlbumStore } from "@/lib/hooks/use-albums";
import { stripExtension, getFileExtension } from "@/lib/utils";
import type { Image, ImageGroup } from "@/lib/types";

export function useImages(albumId: string | null) {
  const supabase = createClient();
  const [images, setImages] = useState<Image[]>([]);
  const [groups, setGroups] = useState<ImageGroup[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = !!albumId && loadedFor !== albumId;
  const refreshAlbums = useAlbumStore((s) => s.fetchAlbums);

  /** Pure loader: no state updates, so effects can await it safely. */
  const load = useCallback(async () => {
    if (!albumId) return null;
    const [imgRes, grpRes] = await Promise.all([
      supabase
        .from("images")
        .select("*")
        .eq("album_id", albumId)
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("image_groups")
        .select("*")
        .eq("album_id", albumId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);
    return {
      albumId,
      images: (imgRes.data ?? []) as Image[],
      groups: (grpRes.data ?? []) as ImageGroup[],
    };
  }, [albumId, supabase]);

  type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;
  const apply = useCallback((r: Loaded | null) => {
    if (!r) return;
    setImages(r.images);
    setGroups(r.groups);
    setLoadedFor(r.albumId);
  }, []);

  const fetchAll = useCallback(async () => {
    apply(await load());
  }, [load, apply]);

  // Initial load + reload when the album changes. Re-fetch when an upload
  // for this album finishes inserting a row (revision bump).
  const revision = useUploadStore((s) => (albumId ? s.revision[albumId] : undefined));
  useEffect(() => {
    let active = true;
    load().then((r) => {
      if (!active) return;
      apply(r);
      if (revision !== undefined) refreshAlbums();
    });
    return () => {
      active = false;
    };
  }, [load, apply, revision, refreshAlbums]);

  // ---------- Reorder ----------
  const reorderImages = useCallback(
    async (orderedIds: string[]) => {
      setImages((prev) => {
        const map = new Map(prev.map((i) => [i.id, i]));
        const next = orderedIds.map((id) => map.get(id)).filter(Boolean) as Image[];
        const rest = prev.filter((i) => !orderedIds.includes(i.id));
        return [...next, ...rest].map((img, idx) => ({ ...img, sort_order: idx }));
      });
      // Only the columns that change — `upsert` with partial rows would trip
      // NOT NULL constraints on insert paths, so update row-by-row in parallel.
      const results = await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from("images").update({ sort_order: idx }).eq("id", id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        console.error("Reorder failed", failed.error);
        await fetchAll();
      } else {
        refreshAlbums(); // cover photo may have changed
      }
    },
    [supabase, fetchAll, refreshAlbums]
  );

  const setGroupOfImages = useCallback(
    async (ids: string[], groupId: string | null) => {
      setImages((prev) =>
        prev.map((img) => (ids.includes(img.id) ? { ...img, group_id: groupId } : img))
      );
      const { error } = await supabase
        .from("images")
        .update({ group_id: groupId })
        .in("id", ids);
      if (error) console.error("Group assign failed", error);
    },
    [supabase]
  );

  // ---------- Rename / caption ----------
  const renameImage = useCallback(
    async (id: string, fileName: string, caption: string) => {
      const { error } = await supabase
        .from("images")
        .update({ file_name: fileName, caption })
        .eq("id", id);
      if (!error) await fetchAll();
      return !error;
    },
    [supabase, fetchAll]
  );

  // ---------- Duplicate ----------
  const duplicateImages = useCallback(
    async (ids: string[]) => {
      const toCopy = images.filter((i) => ids.includes(i.id));
      if (toCopy.length === 0) return false;
      const maxOrder = Math.max(-1, ...images.map((i) => i.sort_order));
      const inserts = toCopy.map((img, idx) => ({
        album_id: img.album_id,
        group_id: img.group_id,
        user_id: img.user_id,
        file_name: `${stripExtension(img.file_name)} (copy)${getFileExtension(img.file_name)}`,
        original_url: img.original_url,
        thumbnail_url: img.thumbnail_url,
        width: img.width,
        height: img.height,
        file_size: img.file_size,
        mime_type: img.mime_type,
        caption: img.caption,
        sort_order: maxOrder + 1 + idx,
      }));
      const { error } = await supabase.from("images").insert(inserts);
      if (!error) {
        await fetchAll();
        refreshAlbums();
      }
      return !error;
    },
    [images, supabase, fetchAll, refreshAlbums]
  );

  // ---------- Move to another album ----------
  const moveImages = useCallback(
    async (ids: string[], targetAlbumId: string) => {
      const { data: maxRow } = await supabase
        .from("images")
        .select("sort_order")
        .eq("album_id", targetAlbumId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const base = (maxRow?.[0]?.sort_order ?? -1) + 1;
      const results = await Promise.all(
        ids.map((id, idx) =>
          supabase
            .from("images")
            .update({ album_id: targetAlbumId, group_id: null, sort_order: base + idx })
            .eq("id", id)
        )
      );
      const error = results.find((r) => r.error)?.error;
      if (!error) {
        await fetchAll();
        refreshAlbums();
      }
      return !error;
    },
    [supabase, fetchAll, refreshAlbums]
  );

  // ---------- Trash (soft delete) ----------
  const trashImages = useCallback(
    async (ids: string[]) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("images")
        .update({ is_deleted: true, deleted_at: now })
        .in("id", ids);
      if (!error) {
        await fetchAll();
        refreshAlbums();
      }
      return !error;
    },
    [supabase, fetchAll, refreshAlbums]
  );

  return {
    images,
    groups,
    loading,
    refetch: fetchAll,
    reorderImages,
    setGroupOfImages,
    renameImage,
    duplicateImages,
    moveImages,
    trashImages,
  };
}
