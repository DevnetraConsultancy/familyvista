import { ThemeToggle } from "@/components/theme-toggle";
import { HelpDialog } from "@/components/help-dialog";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  Images,
  FolderTree,
  GripVertical,
  Layers,
  Trash2,
  Users,
  Check,
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

// Static: signed-in visitors are redirected to /dashboard by the proxy.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <HelpDialog trigger="labeled" />
        <ThemeToggle />
      </SiteHeader>

      <main id="main">
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

      </main>

      <SiteFooter />
    </div>
  );
}
