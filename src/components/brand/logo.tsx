import { cn } from "@/lib/utils";

/** Gold-framed photo mark — the FamilyVista brand icon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#00000033] [background:var(--gold-grad)] shadow-[inset_0_1px_0_#ffffff80,0_2px_6px_-2px_#00000080]",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="#1c1302" strokeWidth="1.8" />
        <circle cx="9" cy="9.5" r="1.6" fill="#1c1302" />
        <path d="M3.5 17.5l5-5 3.5 3.5 3-3 5.5 5.5" stroke="#1c1302" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[1.15rem] font-semibold tracking-tight", className)}>
      Family<span className="text-gold-grad">Vista</span>
    </span>
  );
}
