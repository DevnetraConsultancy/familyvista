"use client";

import { useAlbums } from "@/lib/hooks/use-albums";

/** Albums other people shared with the logged-in user (read-only). */
export function useSharedAlbums() {
  const { sharedAlbums, loading, refetch } = useAlbums();
  return { sharedAlbums, loading, refetch };
}
