import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpDialog } from "@/components/help-dialog";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader>
        <HelpDialog trigger="labeled" />
        <ThemeToggle />
      </SiteHeader>
      <main
        id="main"
        className="ambient-gold flex flex-1 items-center justify-center px-5 py-14"
      >
        {/* Reserve the card's footprint while search params resolve, so the
            page doesn't jump when the form appears. */}
        <Suspense fallback={<div className="h-[420px] w-full max-w-md" aria-hidden />}>
          <LoginForm />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
