"use client";

import { useEffect, useState } from "react";
import { CircleHelp, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SHORTCUTS: [string, string][] = [
  ["← / →", "Next / previous photo"],
  ["Space", "Play / pause slideshow"],
  ["Esc", "Close photo viewer"],
  ["S", "Show / hide sidebar"],
  ["?", "Open Help & About"],
];

const FEATURES = [
  "Create albums and sub-albums with a collapsible sidebar",
  "Bulk upload photos straight to secure cloud storage",
  "Drag & drop to reorder photos exactly how you like",
  "Four view modes — small, large, list and full-screen slideshow",
  "Elegant white borders, inside or outside every photo",
  "Safe trash with restore & phrase-protected permanent delete",
  "Beautiful dark and light themes",
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

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
}

export function HelpDialog({
  trigger = "icon",
  className,
}: {
  trigger?: "icon" | "labeled";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  // "?" toggles the dialog from anywhere (except while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size={trigger === "icon" ? "icon" : "sm"}
        onClick={() => setOpen(true)}
        aria-label="Help & About Us"
        title="Help & About Us (?)"
        className={cn("gap-1.5", className)}
      >
        <CircleHelp />
        {trigger === "labeled" && <span>Help</span>}
      </Button>

      <DialogContent className="max-w-md gap-0 rounded-2xl p-6">
        {/* Brand header */}
        <div className="text-center">
          <DialogTitle className="font-serif text-3xl font-bold tracking-tight">
            FamilyVista
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Your Family Albums, Beautifully Organized
          </DialogDescription>
        </div>

        {/* Keyboard shortcuts */}
        <div className="mt-6">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Keyboard Shortcuts
          </h4>
          <div className="mt-2.5 space-y-2">
            {SHORTCUTS.map(([key, desc]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <kbd className="rounded-md border bg-muted px-2 py-0.5 font-mono text-[11px] shadow-sm">
                  {key}
                </kbd>
                <span className="text-right text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mt-6">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Features
          </h4>
          <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-primary/60">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        <hr className="my-5 border-border/70" />

        {/* Contact */}
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Contact Us
          </h4>
          <p className="mt-2.5 text-sm text-muted-foreground">
            Made by{" "}
            <span className="font-semibold text-foreground">
              Devnetra Consultancy
            </span>
          </p>
          <div className="mt-2 space-y-1.5 text-sm">
            <a
              href="mailto:devnetraconsultancy@gmail.com"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5 text-primary" />
              devnetraconsultancy@gmail.com
            </a>
            <a
              href="https://instagram.com/scien_nee"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <InstagramIcon className="h-3.5 w-3.5 text-primary" />
              @scien_nee on Instagram
            </a>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            className="rounded-full px-8"
            onClick={() => setOpen(false)}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
