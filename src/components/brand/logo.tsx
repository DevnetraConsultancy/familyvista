import { cn } from "@/lib/utils";

/**
 * FamilyVista brand mark: the gold family-in-a-heart artwork on black.
 * Rendered inside a black rounded badge so it reads the same on the cream
 * light theme as on the pure-black dark theme.
 */
export function LogoMark({
  className,
  rounded = "rounded-[22%]",
}: {
  className?: string;
  /** Tailwind radius class for the badge (default a soft squircle). */
  rounded?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden bg-black ring-1 ring-[color-mix(in_oklab,var(--gold)_45%,transparent)] shadow-[0_2px_8px_-2px_rgba(233,189,80,0.45)]",
        rounded,
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark.webp"
        alt=""
        draggable={false}
        className="h-full w-full select-none object-cover"
      />
    </span>
  );
}

/** Large standalone artwork (no badge), for hero/empty-state placements. */
export function LogoArt({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.webp"
      alt="FamilyVista"
      draggable={false}
      className={cn("select-none rounded-full bg-black object-cover", className)}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[1.15rem] font-semibold tracking-tight", className)}>
      Family<span className="text-gold-grad">Vista</span>
    </span>
  );
}
