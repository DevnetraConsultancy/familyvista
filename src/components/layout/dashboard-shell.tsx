"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Images,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  LogOut,
  ChevronsUpDown,
  Check,
  Plus,
} from "lucide-react";
import { useUIStore } from "@/lib/store";
import { useAuth } from "@/components/auth-provider";
import { AlbumSidebar } from "@/components/layout/album-sidebar";
import { UploadTray } from "@/components/images/upload-tray";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpDialog } from "@/components/help-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function UserMenu() {
  const { user, signOut } = useAuth();
  const initials =
    (user?.email?.[0] ?? "?").toUpperCase() +
    (user?.email?.[1] ?? "").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <span className="hidden max-w-28 truncate text-sm sm:inline">
            {user?.email}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const pathname = usePathname();
  const isAlbumPage = pathname.startsWith("/dashboard/album/");
  const [mobileOpen, setMobileOpen] = useState(false);

  // "S" toggles the sidebar (except while typing in inputs)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if ((e.key === "s" || e.key === "S") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "z-30 flex h-full shrink-0 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200",
          "lg:w-64",
          !sidebarOpen && "lg:w-0 lg:border-r-0",
          "max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:w-72 max-lg:border-r-0",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center justify-between border-b px-3 transition-opacity",
            !sidebarOpen && "opacity-0"
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 overflow-hidden font-bold tracking-tight"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Images className="h-3.5 w-3.5" />
            </div>
            <span className="truncate">FamilyVista</span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label="Hide sidebar"
          >
            <PanelLeftClose />
          </Button>
        </div>

        <AlbumSidebar visible={sidebarOpen} />

        <div
          className={cn(
            "border-t p-2 transition-opacity",
            !sidebarOpen && "opacity-0"
          )}
        >
          <Link
            href="/dashboard/trash"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent",
              pathname.includes("/trash") && "bg-accent font-medium"
            )}
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </Link>
          <p className="mt-2 hidden px-2 text-center text-[10px] leading-relaxed text-muted-foreground/70 lg:block">
            Made with ♥ by Devnetra Consultancy
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-3 sm:px-4">
          <div className="flex items-center gap-1.5">
            {/* Show sidebar when hidden, or hamburger on mobile */}
            {(!sidebarOpen || mobileOpen) && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex"
                onClick={() => {
                  if (mobileOpen) {
                    setMobileOpen(false);
                  } else if (!sidebarOpen) {
                    toggleSidebar();
                  }
                }}
                aria-label="Show sidebar"
              >
                <PanelLeftOpen />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <PanelLeftOpen />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <HelpDialog />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>

      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Global upload progress tray (survives album navigation) */}
      <UploadTray />
    </div>
  );
}
