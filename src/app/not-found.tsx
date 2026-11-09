import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader>
        <ThemeToggle />
      </SiteHeader>
      <main
        id="main"
        className="ambient-gold flex flex-1 flex-col items-center justify-center px-5 py-20 text-center"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-text">
          Error 404
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold">
          This page <em className="text-gold-grad">wandered off.</em>
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          The link may be old, or the album may have been moved or deleted.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link href="/dashboard">Go to my albums</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
