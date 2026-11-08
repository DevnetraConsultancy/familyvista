import { cn } from "@/lib/utils";

/**
 * FamilyVista brand mark: the gold family-in-a-heart artwork on black.
 * Rendered inside a black rounded badge with a thin gold border so it reads
 * the same on the cream light theme as on the pure-black dark theme. The
 * artwork is *contained* (never cropped) with a little breathing room.
 */
export function LogoMark({
  className,
  rounded = "rounded-[24%]",
}: {
  className?: string;
  /** Tailwind radius class for the badge (default a soft squircle). */
  rounded?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden bg-black",
        "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--gold)_70%,transparent),0_2px_10px_-2px_rgba(233,189,80,0.5)]",
        rounded,
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark.webp"
        alt=""
        draggable={false}
        className="h-full w-full select-none object-contain"
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

/** "FamilyVista" in the display serif: "Family" in the foreground colour, "Vista" in gold. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display whitespace-nowrap text-[1.4rem] font-bold leading-none tracking-[-0.02em]",
        className
      )}
    >
      Family<span className="text-gold-grad">Vista</span>
    </span>
  );
}

/**
 * The full lockup (badge + wordmark) used in page corners. Sized as one unit
 * so the mark and the text always keep the same proportions.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const sm = size === "sm";
  return (
    <span className={cn("inline-flex items-center", sm ? "gap-2" : "gap-2.5", className)}>
      <LogoMark className={sm ? "h-8 w-8" : "h-9 w-9"} />
      <Wordmark className={sm ? "text-[1.25rem]" : undefined} />
    </span>
  );
}
