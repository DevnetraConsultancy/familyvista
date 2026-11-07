"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark, Wordmark } from "@/components/brand/logo";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const urlError = searchParams.get("error");

  const errorMessage = urlError
    ? urlError === "exchange_failed"
      ? "Sign-in session could not be established. Please try again."
      : urlError === "no_code"
        ? "Sign-in was interrupted. Please try again."
        : `Sign-in failed: ${urlError}`
    : null;

  return (
    <div className="ambient-gold relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-5">
      <div className="absolute left-5 top-5 z-10">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <Wordmark />
        </Link>
      </div>
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-7 sm:p-8">
        <LogoMark className="mb-5 h-20 w-20" rounded="rounded-full" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-text">
          Welcome back
        </p>
        <h1 className="font-display mt-2 text-[1.75rem] font-semibold leading-tight">
          Sign in to <em className="text-gold-grad">FamilyVista</em>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Use your Google account. No password to remember.
        </p>

        <div className="mt-6">
          <GoogleSignInButton redirectTo={next} />
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-[color-mix(in_oklab,var(--danger)_35%,transparent)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger"
          >
            {errorMessage}
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          By continuing you agree that we store your Google name, email and
          photo to run your account. Your albums stay private to you and the
          people you invite.
        </p>
      </div>
    </div>
  );
}
