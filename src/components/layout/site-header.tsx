import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * The one header used on every page (landing, login, dashboard, 404).
 *
 * The logo lockup is locked: same size, same position (16/20px from the
 * left edge, vertically centred in a fixed 56px bar) on every route and at
 * every breakpoint. Nothing inside the app (sidebar, drawer, dialogs) is
 * allowed to move it — the sidebar lives *below* this bar.
 */
export function SiteHeader({
  homeHref = "/",
  children,
  className,
}: {
  homeHref?: string;
  /** Right-hand actions. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-[var(--header-h)] shrink-0 border-b border-[var(--line)] bg-background/90 backdrop-blur-xl",
        className
      )}
    >
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-5">
        <Link
          href={homeHref}
          aria-label="FamilyVista home"
          className="-mx-1 shrink-0 rounded-lg px-1 py-1 focus-visible:outline-offset-0"
        >
          <Logo />
        </Link>
        <div className="flex min-w-0 items-center gap-1">{children}</div>
      </div>
    </header>
  );
}
