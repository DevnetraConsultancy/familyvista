"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Album, Image } from "@/lib/types";

/**
 * One shared album store for the whole dashboard.
 *
 * Previously every consumer (sidebar, dashboard grid, album page) ran its own
 * `useAlbums()` with private state, so creating or renaming an album in one
 * place left the others stale until a full reload, and the album + image
 * tables were fetched three times per navigation. Now there is one fetch and
 * one source of truth; every mutation refreshes it for all subscribers.
 */
interface AlbumState {
  /** Albums owned by the signed-in user (not trashed). */
  albums: Album[];
  /** Albums other people shared with the signed-in user (read-only). */
  sharedAlbums: Album[];
  userId: string | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  fetchAlbums: () => Promise<void>;
}

type ImageStat = Pick<
  Image,
  "album_id" | "sort_order" | "thumbnail_url" | "original_url"
>;

export const useAlbumStore = create<AlbumState>((set) => ({
  albums: [],
  sharedAlbums: [],
  userId: null,
  loading: true,
  loaded: false,
  error: null,

  fetchAlbums: async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Link any pending invites (email match) before reading shares.
    await supabase.rpc("accept_my_invites").then(() => undefined, () => undefined);

    const [{ data, error }, { data: imgs }] = await Promise.all([
      supabase
        .from("albums")
        .select("*")
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("images")
        .select("album_id, sort_order, thumbnail_url, original_url")
        .eq("is_deleted", false),
    ]);

    if (error) {
      set({ error: error.message, loading: false, loaded: true });
      return;
    }

    // Per-album photo count + cover fallback (first photo by sort order).
    const stats = new Map<
      string,
      { count: number; cover: string | null; coverOrder: number }
    >();
    for (const img of (imgs ?? []) as ImageStat[]) {
      const url = img.thumbnail_url ?? img.original_url;
      const cur = stats.get(img.album_id);
      if (!cur) {
        stats.set(img.album_id, { count: 1, cover: url, coverOrder: img.sort_order });
      } else {
        cur.count += 1;
        if (url && (cur.cover === null || img.sort_order < cur.coverOrder)) {
          cur.cover = url;
          cur.coverOrder = img.sort_order;
        }
      }
    }

    const all = ((data ?? []) as Album[]).map((a) => ({
      ...a,
      image_count: stats.get(a.id)?.count ?? 0,
      cover_image_url: a.cover_image_url ?? stats.get(a.id)?.cover ?? null,
    }));

    // RLS returns shared albums in the same query — split them out so they
    // never show up under "Your albums" with owner-only actions.
    const uid = user?.id ?? null;
    set({
      userId: uid,
      albums: all.filter((a) => a.user_id === uid),
      sharedAlbums: all.filter((a) => a.user_id !== uid),
      loading: false,
      loaded: true,
      error: null,
    });
  },
}));

/** Collect an album and every descendant (any depth). */
export function collectDescendantIds(albums: Album[], rootId: string): string[] {
  const out = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const a of albums) {
      if (a.parent_id === cur && !out.includes(a.id)) {
        out.push(a.id);
        queue.push(a.id);
      }
    }
  }
  return out;
}

/** Walk parent_id links up to the root: [album, parent, grandparent, …]. */
export function ancestorChain(albums: Album[], id: string): Album[] {
  const byId = new Map(albums.map((a) => [a.id, a]));
  const chain: Album[] = [];
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.push(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return chain;
}

export function useAlbums() {
  const store = useAlbumStore();
  const supabase = createClient();

  useEffect(() => {
    if (!store.loaded && store.loading) void store.fetchAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = store.fetchAlbums;

  const createAlbum = async (
    name: string,
    parentId: string | null,
    description?: string
  ): Promise<Album | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    let q = supabase
      .from("albums")
      .select("sort_order")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("sort_order", { ascending: false })
      .limit(1);
    q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
    const { data: maxRow } = await q;
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
      toast.error(`Could not create album: ${error.message}`);
      return null;
    }
    await refetch();
    return data as Album;
  };

  const renameAlbum = async (id: string, name: string) => {
    const { error } = await supabase.from("albums").update({ name }).eq("id", id);
    if (!error) await refetch();
    return !error;
  };

  const updateAlbum = async (id: string, updates: Partial<Album>) => {
    const { error } = await supabase.from("albums").update(updates).eq("id", id);
    if (!error) await refetch();
    return !error;
  };

  /**
   * Deep-duplicate an album: sub-albums (any depth) and photo rows.
   * Photo rows point at the same storage objects; permanent deletion only
   * removes a file once no row references it (see use-trash).
   */
  const duplicateAlbum = async (album: Album): Promise<boolean> => {
    const all = useAlbumStore.getState().albums;

    const copyOne = async (src: Album, parentId: string | null, name: string) => {
      const { data: copy, error } = await supabase
        .from("albums")
        .insert({
          name,
          parent_id: parentId,
          description: src.description,
          user_id: src.user_id,
          cover_image_url: null,
          sort_order: src.sort_order + 1,
        })
        .select()
        .single();
      if (error || !copy) return null;

      const { data: images } = await supabase
        .from("images")
        .select("*")
        .eq("album_id", src.id)
        .eq("is_deleted", false);
      if (images && images.length > 0) {
        await supabase.from("images").insert(
          (images as Image[]).map((img) => ({
            album_id: copy.id,
            group_id: null,
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

      for (const child of all.filter((a) => a.parent_id === src.id)) {
        await copyOne(child, copy.id, child.name);
      }
      return copy as Album;
    };

    const ok = await copyOne(album, album.parent_id, `${album.name} (copy)`);
    await refetch();
    return !!ok;
  };

  /** Soft-delete an album plus all descendants and their photos. */
  const trashAlbum = async (id: string) => {
    const ids = collectDescendantIds(useAlbumStore.getState().albums, id);
    const now = new Date().toISOString();
    const { error: imgErr } = await supabase
      .from("images")
      .update({ is_deleted: true, deleted_at: now })
      .in("album_id", ids)
      .eq("is_deleted", false);
    if (imgErr) return false;
    const { error } = await supabase
      .from("albums")
      .update({ is_deleted: true, deleted_at: now })
      .in("id", ids);
    if (!error) await refetch();
    return !error;
  };

  const reorderAlbums = async (id: string, sortOrder: number) => {
    const { error } = await supabase
      .from("albums")
      .update({ sort_order: sortOrder })
      .eq("id", id);
    if (!error) await refetch();
    return !error;
  };

  return {
    albums: store.albums,
    sharedAlbums: store.sharedAlbums,
    userId: store.userId,
    loading: store.loading,
    error: store.error,
    refetch,
    createAlbum,
    renameAlbum,
    updateAlbum,
    duplicateAlbum,
    trashAlbum,
    reorderAlbums,
  };
}

/** Build a nested tree (any depth) from the flat album list. */
export function buildAlbumTree(albums: Album[]): Album[] {
  const byParent = new Map<string | null, Album[]>();
  for (const a of albums) {
    const key = a.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(a);
    byParent.set(key, list);
  }
  const ids = new Set(albums.map((a) => a.id));
  const build = (parent: string | null): Album[] =>
    (byParent.get(parent) ?? [])
      .slice()
      .sort((x, y) => x.sort_order - y.sort_order || x.created_at.localeCompare(y.created_at))
      .map((a) => ({ ...a, children: build(a.id) }));

  // Roots: no parent, or a parent we can't see (e.g. parent is trashed).
  const roots = albums.filter((a) => !a.parent_id || !ids.has(a.parent_id));
  return roots
    .sort((x, y) => x.sort_order - y.sort_order || x.created_at.localeCompare(y.created_at))
    .map((a) => ({ ...a, children: build(a.id) }));
}
