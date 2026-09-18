"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ViewMode, BorderSettings, SortKey } from "@/lib/types";

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
        set({ selectedIds: next, selectionMode: next.size > 0 });
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
        viewMode: state.viewMode,
        borderSettings: state.borderSettings,
        sortBy: state.sortBy,
        sortAsc: state.sortAsc,
      }),
    }
  )
);
