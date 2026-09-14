"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Album } from "@/lib/types";

export function useAlbums() {
  const supabase = createClient();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlbums = useCallback(async () => {
    const { data, error } = await supabase
      .from("albums")
      .select("*")
      .eq("is_deleted", false)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setAlbums(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const createAlbum = useCallback(
    async (
      name: string,
      parentId: string | null,
      description?: string
    ): Promise<Album | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: maxRow } = await supabase
        .from("albums")
        .select("sort_order")
        .eq("user_id", user.id)
        .is("parent_id", parentId)
        .eq("is_deleted", false)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = (maxRow?.[0]?.sort_order ?? -1) + 1;

      const { data, error } = await supabase
        .from("albums")
        .insert({
          name,
          parent_id: parentId,
          description: description ?? "",
          user_id: user.id,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) {
        setError(error.message);
        return null;
      }
      await fetchAlbums();
      return data;
    },
    [supabase, fetchAlbums]
  );

  const renameAlbum = useCallback(
    async (id: string, name: string) => {
      const { error } = await supabase
        .from("albums")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) await fetchAlbums();
      return !error;
    },
    [supabase, fetchAlbums]
  );

  const updateAlbum = useCallback(
    async (id: string, updates: Partial<Album>) => {
      const { error } = await supabase
        .from("albums")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) await fetchAlbums();
      return !error;
    },
    [supabase, fetchAlbums]
  );

  const duplicateAlbum = useCallback(
    async (album: Album): Promise<boolean> => {
      const { data: copy, error } = await supabase
        .from("albums")
        .insert({
          name: `${album.name} (copy)`,
          parent_id: album.parent_id,
          description: album.description,
          user_id: album.user_id,
          cover_image_url: album.cover_image_url,
          sort_order: album.sort_order + 1,
        })
        .select()
        .single();
      if (error || !copy) return false;

      // copy images
      const { data: images } = await supabase
        .from("images")
        .select("*")
        .eq("album_id", album.id)
        .eq("is_deleted", false);
      if (images && images.length > 0) {
        await supabase.from("images").insert(
          images.map((img) => ({
            album_id: copy.id,
            group_id: img.group_id,
            user_id: img.user_id,
            file_name: img.file_name,
            original_url: img.original_url,
            thumbnail_url: img.thumbnail_url,
            width: img.width,
            height: img.height,
            file_size: img.file_size,
            mime_type: img.mime_type,
            caption: img.caption,
            sort_order: img.sort_order,
          }))
        );
      }
      await fetchAlbums();
      return true;
    },
    [supabase, fetchAlbums]
  );

  // Soft delete → trash
  const trashAlbum = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("albums")
        .update({ is_deleted: true, deleted_at: now })
        .eq("id", id);
      if (!error) await fetchAlbums();
      return !error;
    },
    [supabase, fetchAlbums]
  );

  const reorderAlbums = useCallback(
    async (id: string, sortOrder: number) => {
      const { error } = await supabase
        .from("albums")
        .update({ sort_order: sortOrder })
        .eq("id", id);
      if (!error) await fetchAlbums();
      return !error;
    },
    [supabase, fetchAlbums]
  );

  return {
    albums,
    loading,
    error,
    refetch: fetchAlbums,
    createAlbum,
    renameAlbum,
    updateAlbum,
    duplicateAlbum,
    trashAlbum,
    reorderAlbums,
  };
}

/** Build a tree from flat album list (2-level: parent → children) */
export function buildAlbumTree(albums: Album[]): Album[] {
  const roots = albums.filter((a) => !a.parent_id);
  const byParent = new Map<string, Album[]>();
  for (const a of albums) {
    if (a.parent_id) {
      const list = byParent.get(a.parent_id) ?? [];
      list.push(a);
      byParent.set(a.parent_id, list);
    }
  }
  return roots.map((root) => ({
    ...root,
    children: (byParent.get(root.id) ?? []).sort(
      (x, y) => x.sort_order - y.sort_order
    ),
  }));
}
