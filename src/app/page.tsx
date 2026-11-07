import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpDialog } from "@/components/help-dialog";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import {
  Images,
  FolderTree,
  GripVertical,
  Layers,
  Trash2,
  Users,
  Check,
  Mail,
} from "lucide-react";

const features = [
  {
    icon: FolderTree,
    title: "Albums and sub-albums",
    desc: "Organize memories into nested albums that make sense for your family.",
  },
  {
    icon: Images,
    title: "Bulk upload",
    desc: "Drop in hundreds of photos at once. Compressed on-device, sent straight to storage.",
  },
  {
    icon: GripVertical,
    title: "Drag and drop ordering",
    desc: "Rearrange photos exactly how you want, then sort by name, date or size when you need to.",
  },
  {
    icon: Layers,
    title: "Four ways to look",
    desc: "Small tiles, large tiles, a list, or a full-screen slideshow with a timer.",
  },
  {
    icon: Users,
    title: "Share with family",
    desc: "Invite relatives by email. They see the album in their own account, view-only.",
  },
  {
    icon: Trash2,
    title: "Safe trash",
    desc: "Nothing disappears by accident. Restore anytime. Permanent delete needs a typed phrase.",
  },
];

const proofs = [
  "Nested albums, drag ordering, four view modes",
  "Photos compressed before upload, never visibly worse",
  "Share view-only with family, restore anything from trash",
];

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

export default async function Home() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  } catch {
    signedIn = false;
  }
  if (signedIn) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark />
          </div>
          <div className="flex items-center gap-1">
            <HelpDialog trigger="labeled" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="ambient-gold relative">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
          <div className="max-w-xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-text">
              Family photo albums
            </p>
            <h1 className="font-display text-[2.75rem] font-semibold leading-[1.05] sm:text-[3.5rem] lg:text-[4rem]">
              Every memory,{" "}
              <em className="text-gold-grad">kept.</em>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Create albums, upload photos in bulk, drag them into order, share
              with the people who were there, and relive it all in a full-screen
              slideshow.
            </p>
            <ul className="mt-8 space-y-3">
              {proofs.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-foreground/90">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--gold-soft)] text-gold">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Sign-in card */}
          <div className="glass-strong w-full rounded-2xl p-7 sm:p-8 lg:justify-self-end lg:max-w-md">
            <h2 className="font-display text-2xl font-semibold leading-tight">
              Sign in to FamilyVista
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use your Google account. No password to remember.
            </p>
            <div className="mt-6">
              <GoogleSignInButton redirectTo="/dashboard" />
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              By continuing you agree that we store your Google name, email and
              photo to run your account. Your albums are private to you and the
              people you invite.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-[var(--line)] py-20 lg:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-text">
            What you get
          </p>
          <h2 className="font-display mt-2 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            Everything a family archive <em className="text-gold-grad">needs.</em>
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass glass-hover rounded-xl p-6 transition-colors"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--gold-soft)] text-gold">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold leading-snug">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--line)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 py-14 text-center sm:px-8">
          <p className="font-display text-2xl font-medium">
            Every photo tells <em className="text-gold-grad">the story.</em>
          </p>
          <p className="text-sm text-muted-foreground">
            Made with care by{" "}
            <span className="font-medium text-foreground">Devnetra Consultancy</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <a
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              href="mailto:devnetraconsultancy@gmail.com"
            >
              <Mail className="h-3.5 w-3.5 text-gold" />
              devnetraconsultancy@gmail.com
            </a>
            <a
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              href="https://instagram.com/scien_nee"
              target="_blank"
              rel="noreferrer"
            >
              <InstagramIcon className="h-3.5 w-3.5 text-gold" />
              @scien_nee
            </a>
            <span>
              Need help? Press{" "}
              <kbd className="rounded border border-[var(--line)] bg-[var(--field)] px-1.5 py-0.5 font-mono text-[10px]">
                ?
              </kbd>
            </span>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} Devnetra Consultancy · FamilyVista
          </p>
        </div>
      </footer>
    </div>
  );
}
