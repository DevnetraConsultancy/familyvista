"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUploadStore } from "@/lib/upload-store";
import { stripExtension } from "@/lib/utils";
import type { Image, ImageGroup } from "@/lib/types";

export function useImages(albumId: string | null) {
  const supabase = createClient();
  const [images, setImages] = useState<Image[]>([]);
  const [groups, setGroups] = useState<ImageGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!albumId) {
      setImages([]);
      setGroups([]);
      return;
    }
    setLoading(true);
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
    if (imgRes.data) setImages(imgRes.data);
    if (grpRes.data) setGroups(grpRes.data);
    setLoading(false);
  }, [albumId, supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refetch when an upload for this album finishes inserting a row.
  const revision = useUploadStore((s) => (albumId ? s.revision[albumId] : undefined));
  useEffect(() => {
    if (revision !== undefined) fetchAll();
  }, [revision, fetchAll]);

  // ---------- Reorder ----------
  const reorderImages = useCallback(
    async (orderedIds: string[]) => {
      // optimistic
      setImages((prev) => {
        const map = new Map(prev.map((i) => [i.id, i]));
        const next = orderedIds
          .map((id) => map.get(id))
          .filter(Boolean) as Image[];
        // append images not in orderedIds (other groups)
        const rest = prev.filter((i) => !orderedIds.includes(i.id));
        return [...next, ...rest];
      });
      const updates = orderedIds.map((id, idx) => ({ id, sort_order: idx }));
      const { error } = await supabase.from("images").upsert(updates, {
        onConflict: "id",
      });
      if (error) console.error("Reorder failed", error);
    },
    [supabase]
  );

  const setGroupOfImages = useCallback(
    async (ids: string[], groupId: string | null) => {
      setImages((prev) =>
        prev.map((img) =>
          ids.includes(img.id) ? { ...img, group_id: groupId } : img
        )
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
    async (id: string, fileName: string, caption?: string) => {
      const updates: Partial<Image> = { file_name: fileName };
      if (caption !== undefined) updates.caption = caption;
      const { error } = await supabase
        .from("images")
        .update(updates)
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
      if (toCopy.length === 0) return;
      const maxOrder = Math.max(-1, ...images.map((i) => i.sort_order));
      const inserts = toCopy.map((img, idx) => ({
        album_id: img.album_id,
        group_id: img.group_id,
        user_id: img.user_id,
        file_name: `${stripExtension(img.file_name)} (copy)${img.file_name.slice(
          img.file_name.lastIndexOf(".")
        )}`,
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
      if (!error) await fetchAll();
    },
    [images, supabase, fetchAll]
  );

  // ---------- Trash (soft delete) ----------
  const trashImages = useCallback(
    async (ids: string[]) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("images")
        .update({ is_deleted: true, deleted_at: now })
        .in("id", ids);
      if (!error) await fetchAll();
      return !error;
    },
    [supabase, fetchAll]
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
    trashImages,
  };
}
