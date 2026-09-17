"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Album } from "@/lib/types";

/** Albums other people shared with the logged-in user (read-only). */
export function useSharedAlbums() {
  const supabase = createClient();
  const [sharedAlbums, setSharedAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShared = useCallback(async () => {
    // Link any pending invites to this account first (email match),
    // then pull albums shared with me.
    await supabase.rpc("accept_my_invites");

    const { data: shareRows } = await supabase
      .from("album_shares")
      .select("album_id")
      .eq("status", "accepted");

    if (!shareRows || shareRows.length === 0) {
      setSharedAlbums([]);
      setLoading(false);
      return;
    }

    const ids = shareRows.map((r) => r.album_id);
    const { data: albums } = await supabase
      .from("albums")
      .select("*")
      .in("id", ids)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    setSharedAlbums(albums ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

  return { sharedAlbums, loading, refetch: fetchShared };
}
