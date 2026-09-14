import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpDialog } from "@/components/help-dialog";
import { GoogleSignInButton } from "@/components/google-signin-button";
import {
  Images,
  FolderTree,
  GripVertical,
  Layers,
  Sparkles,
  Trash2,
  Sun,
  Heart,
} from "lucide-react";

const features = [
  {
    icon: FolderTree,
    title: "Albums & Sub-Albums",
    desc: "Organize memories into nested albums that make sense for your family.",
  },
  {
    icon: Images,
    title: "Bulk Upload",
    desc: "Drop in hundreds of photos at once. Direct-to-storage, blazing fast.",
  },
  {
    icon: GripVertical,
    title: "Drag & Drop Ordering",
    desc: "Rearrange photos exactly how you want with buttery-smooth dragging.",
  },
  {
    icon: Layers,
    title: "Groups & Views",
    desc: "Group photos by event or year. Small, large, list, and slideshow views.",
  },
  {
    icon: Sun,
    title: "Photo Borders",
    desc: "Add elegant white borders inside or outside each photo, your call.",
  },
  {
    icon: Trash2,
    title: "Safe Trash",
    desc: "Nothing disappears by accident. Restore anytime — permanent delete needs a phrase.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Images className="h-4 w-4" />
            </div>
            FamilyVista
          </div>
          <div className="flex items-center gap-2">
            <HelpDialog trigger="labeled" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero with centered Google sign-in */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Your memories deserve a beautiful home
          </div>
          <h1 className="max-w-3xl text-5xl font-extrabold tracking-tight sm:text-6xl">
            Family albums,
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent-foreground bg-clip-text text-transparent">
              beautifully organized
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Create albums, upload photos in bulk, drag to reorder, group by
            occasion, and relive everything in a gorgeous full-screen slideshow.
          </p>

          {/* Premium centered sign-in */}
          <div className="mt-10 flex w-full flex-col items-center">
            <GoogleSignInButton redirectTo="/dashboard" />
            <p className="mt-3 text-xs text-muted-foreground">
              Free forever · Takes less than a minute
            </p>
          </div>

          {/* Mock preview strip */}
          <div className="mt-16 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              "from-amber-200/60 to-orange-300/60",
              "from-rose-200/60 to-pink-300/60",
              "from-sky-200/60 to-indigo-300/60",
              "from-emerald-200/60 to-teal-300/60",
            ].map((grad, i) => (
              <div
                key={i}
                className={`aspect-[4/3] rounded-xl bg-gradient-to-br ${grad} border border-border/40 shadow-lg transition-transform hover:-translate-y-1`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your family photo archive needs
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer — premium brand signature */}
      <footer className="relative border-t border-border/50">
        <div
          className="hero-gradient pointer-events-none absolute inset-0 opacity-60"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Made with
            <Heart
              className="h-3.5 w-3.5 animate-pulse fill-rose-500 text-rose-500"
              aria-hidden
            />
            care by
          </p>
          <p className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="bg-gradient-to-r from-primary via-foreground/80 to-primary bg-clip-text text-transparent">
              Devnetra Consultancy
            </span>
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <a
              className="transition-colors hover:text-foreground"
              href="mailto:devnetraconsultancy@gmail.com"
            >
              devnetraconsultancy@gmail.com
            </a>
            <span aria-hidden className="opacity-40">
              ·
            </span>
            <a
              className="transition-colors hover:text-foreground"
              href="https://instagram.com/scien_nee"
              target="_blank"
              rel="noreferrer"
            >
              @scien_nee
            </a>
            <span aria-hidden className="opacity-40">
              ·
            </span>
            <span>
              Need help? Press{" "}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
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
