"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ViewMode, BorderSettings, SortKey } from "@/lib/types";

/** Seconds each photo stays on screen in the slideshow. */
export const SLIDESHOW_INTERVALS = [1, 2, 3, 5, 10, 15] as const;

/** Border colour presets (name → CSS colour). */
export const BORDER_COLORS: { name: string; value: string }[] = [
  { name: "White", value: "#ffffff" },
  { name: "Cream", value: "#f3ead6" },
  { name: "Gold", value: "#e9bd50" },
  { name: "Charcoal", value: "#1a1a18" },
  { name: "Black", value: "#000000" },
];

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  sortBy: SortKey;
  sortAsc: boolean;
  setSortBy: (key: SortKey) => void;
  setSortAsc: (asc: boolean) => void;

  borderSettings: BorderSettings;
  setBorderSettings: (s: Partial<BorderSettings>) => void;

  /** Slideshow seconds-per-photo (see SLIDESHOW_INTERVALS). */
  slideshowInterval: number;
  setSlideshowInterval: (sec: number) => void;

  // selection
  selectionMode: boolean;
  toggleSelectionMode: () => void;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      viewMode: "large",
      setViewMode: (mode) => set({ viewMode: mode }),

      sortBy: "custom",
      sortAsc: true,
      setSortBy: (key) => set({ sortBy: key }),
      setSortAsc: (asc) => set({ sortAsc: asc }),

      borderSettings: {
        enabled: true,
        width: 8,
        inside: false,
        color: "#ffffff",
      },
      setBorderSettings: (s) =>
        set({ borderSettings: { ...get().borderSettings, ...s } }),

      slideshowInterval: 3,
      setSlideshowInterval: (sec) => set({ slideshowInterval: sec }),

      selectionMode: false,
      toggleSelectionMode: () =>
        set({
          selectionMode: !get().selectionMode,
          selectedIds: new Set(),
        }),
      selectedIds: new Set<string>(),
      toggleSelected: (id) => {
        const next = new Set(get().selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        set({ selectedIds: next });
      },
      selectMany: (ids) =>
        set({ selectedIds: new Set(ids), selectionMode: ids.length > 0 }),
      clearSelection: () =>
        set({ selectedIds: new Set(), selectionMode: false }),
    }),
    {
      name: "familyvista-ui",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        viewMode: state.viewMode === "play" ? "large" : state.viewMode,
        borderSettings: state.borderSettings,
        sortBy: state.sortBy,
        sortAsc: state.sortAsc,
        slideshowInterval: state.slideshowInterval,
      }),
    }
  )
);
