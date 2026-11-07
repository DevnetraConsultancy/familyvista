import { cn } from "@/lib/utils";

/** Consistent page title block: eyebrow label, serif title, muted lead. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-text">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[1.9rem] font-semibold leading-[1.1] sm:text-[2.2rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
