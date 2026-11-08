"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  LogOut,
  ChevronRight,
  ChevronDown,
  Images,
  Users,
} from "lucide-react";
import { useUIStore } from "@/lib/store";
import { useAuth } from "@/components/auth-provider";
import { useAlbumStore, ancestorChain } from "@/lib/hooks/use-albums";
import { AlbumSidebar } from "@/components/layout/album-sidebar";
import { UploadTray } from "@/components/images/upload-tray";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpDialog } from "@/components/help-dialog";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function UserMenu() {
  const { user, signOut } = useAuth();
  const meta = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
  const name = meta.full_name || meta.name || user?.email || "Account";
  const avatar = meta.avatar_url || meta.picture;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass)] py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-[var(--glass-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-gold-fg [background:var(--gold-grad)]">
              {initials}
            </span>
          )}
          <span className="hidden max-w-32 truncate sm:inline">{name}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block truncate text-sm font-medium text-foreground">{name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/trash">
            <Trash2 />
            Trash
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-danger focus:text-danger">
          <LogOut className="!text-danger" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Breadcrumbs() {
  const pathname = usePathname();
  const albums = useAlbumStore((s) => s.albums);
  const shared = useAlbumStore((s) => s.sharedAlbums);

  const crumbs: { href: string; label: React.ReactNode }[] = [
    { href: "/dashboard", label: "All albums" },
  ];

  if (pathname === "/dashboard/trash") {
    crumbs.push({ href: pathname, label: "Trash" });
  } else if (pathname.startsWith("/dashboard/album/")) {
    const id = pathname.split("/")[3];
    const all = [...albums, ...shared];
    const chain = ancestorChain(all, id).reverse();
    if (chain.length === 0) {
      crumbs.push({ href: pathname, label: "Album" });
    } else {
      const isShared = shared.some((a) => a.id === chain[0].id);
      if (isShared) {
        crumbs.push({
          href: "/dashboard",
          label: (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> Shared
            </span>
          ),
        });
      }
      for (const a of chain) crumbs.push({ href: `/dashboard/album/${a.id}`, label: a.name });
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.href + i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
            {last ? (
              <span className="truncate font-medium text-foreground">{c.label}</span>
            ) : (
              <Link
                href={c.href}
                className="truncate text-muted-foreground transition-colors hover:text-foreground"
              >
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer on navigation (state adjustment during render).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMobileOpen(false);
  }

  // "S" toggles the sidebar (except while typing or inside a dialog)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable ||
          t.closest("[role=dialog]"))
      )
        return;
      if ((e.key === "s" || e.key === "S") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  // On small screens the drawer is the only sidebar; ignore the desktop
  // "collapsed" preference there (it used to hide the drawer's contents).
  const contentVisible = sidebarOpen || mobileOpen;

  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "z-30 flex h-full shrink-0 flex-col overflow-hidden border-r border-[var(--line)] bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 ease-out",
          "lg:w-[272px]",
          !sidebarOpen && "lg:w-0 lg:border-r-0",
          "max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:w-[288px] max-lg:shadow-[var(--glass-shadow-lg)]",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        )}
        aria-hidden={!contentVisible}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center justify-between pl-4 pr-2 transition-opacity",
            !contentVisible && "opacity-0"
          )}
        >
          <Link href="/dashboard" className="flex items-center overflow-hidden">
            <Logo size="sm" />
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => (mobileOpen ? setMobileOpen(false) : toggleSidebar())}
                aria-label="Hide sidebar"
              >
                <PanelLeftClose />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Hide sidebar <kbd className="ml-1 opacity-70">S</kbd>
            </TooltipContent>
          </Tooltip>
        </div>

        <AlbumSidebar visible={contentVisible} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] bg-background/80 px-3 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {!sidebarOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:inline-flex"
                    onClick={toggleSidebar}
                    aria-label="Show sidebar"
                  >
                    <PanelLeftOpen />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Show sidebar <kbd className="ml-1 opacity-70">S</kbd>
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open sidebar"
            >
              <PanelLeftOpen />
            </Button>
            {!sidebarOpen && (
              <Link
                href="/dashboard"
                className="hidden items-center gap-2 pr-1 lg:flex"
                aria-label="FamilyVista home"
              >
                <LogoMark className="h-7 w-7" />
              </Link>
            )}
            <Breadcrumbs />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild aria-label="All albums">
                  <Link href="/dashboard">
                    <Images />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">All albums</TooltipContent>
            </Tooltip>
            <HelpDialog />
            <ThemeToggle />
            <div className="ml-1">
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto scrollbar-thin">{children}</main>
      </div>

      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Global upload progress tray (survives album navigation) */}
      <UploadTray />
    </div>
  );
}
