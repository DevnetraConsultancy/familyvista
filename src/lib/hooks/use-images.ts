"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeFileName, stripExtension } from "@/lib/utils";
import type { Image, ImageGroup } from "@/lib/types";

const BUCKET = "images";

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

  // ---------- Upload ----------
  const uploadFiles = useCallback(
    async (
      files: File[],
      groupId: string | null,
      onProgress?: (done: number, total: number) => void
    ): Promise<boolean> => {
      if (!albumId || files.length === 0) return false;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      let maxOrder = -1;
      {
        const { data } = await supabase
          .from("images")
          .select("sort_order")
          .eq("album_id", albumId)
          .order("sort_order", { ascending: false })
          .limit(1);
        maxOrder = data?.[0]?.sort_order ?? -1;
      }

      let done = 0;
      let ok = true;

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          done++;
          continue;
        }
        const safe = sanitizeFileName(file.name);
        const path = `${user.id}/${albumId}/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}_${safe}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "31536000", upsert: false });

        if (upErr) {
          console.error("Upload failed", file.name, upErr);
          ok = false;
        } else {
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
          const url = pub.publicUrl;

          // get dimensions
          const dims = await getImageDimensions(url).catch(() => null);

          const { error: dbErr } = await supabase.from("images").insert({
            album_id: albumId,
            group_id: groupId,
            user_id: user.id,
            file_name: file.name,
            original_url: url,
            thumbnail_url: url,
            width: dims?.width ?? null,
            height: dims?.height ?? null,
            file_size: file.size,
            mime_type: file.type || null,
            sort_order: ++maxOrder,
          });
          if (dbErr) {
            console.error("DB insert failed", dbErr);
            ok = false;
          }
        }
        done++;
        onProgress?.(done, files.length);
      }

      await fetchAll();
      return ok;
    },
    [albumId, supabase, fetchAll]
  );

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
    uploadFiles,
    reorderImages,
    setGroupOfImages,
    renameImage,
    duplicateImages,
    trashImages,
  };
}

function getImageDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}
