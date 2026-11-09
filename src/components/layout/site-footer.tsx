import { Mail } from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/** The one footer used on every public page (landing, login, 404). */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 py-10 text-center sm:px-8">
        <p className="font-display text-xl font-medium">
          Every photo tells <em className="text-gold-grad">the story.</em>
        </p>
        <p className="text-sm text-muted-foreground">
          Made with care by{" "}
          <span className="font-medium text-foreground">Devnetra Consultancy</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <a
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            href="mailto:devnetraconsultancy@gmail.com"
          >
            <Mail className="h-3.5 w-3.5 text-gold" aria-hidden />
            devnetraconsultancy@gmail.com
          </a>
          <a
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            href="https://instagram.com/scien_nee"
            target="_blank"
            rel="noopener noreferrer"
          >
            <InstagramIcon className="h-3.5 w-3.5 text-gold" />
            @scien_nee
          </a>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Devnetra Consultancy · FamilyVista
        </p>
      </div>
    </footer>
  );
}
