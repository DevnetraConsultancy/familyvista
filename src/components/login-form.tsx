"use client";

import { useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Images } from "lucide-react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const urlError = searchParams.get("error");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Ambient background */}
      <div className="hero-gradient pointer-events-none absolute inset-0" />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        {/* Logo mark */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/15 shadow-inner ring-1 ring-primary/20">
          <Images className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight">FamilyVista</h1>
        <p className="mt-2 text-balance text-muted-foreground">
          Your family albums, beautifully organized.
        </p>

        {/* Premium Google sign-in */}
        <div className="mt-10 w-full">
          <GoogleSignInButton redirectTo={next} />
        </div>

        {urlError && (
          <p className="mt-4 text-sm text-destructive">
            {urlError === "exchange_failed"
              ? "Sign-in session could not be established. Please try again."
              : urlError === "no_code"
                ? "Sign-in was interrupted. Please try again."
                : `Sign-in failed: ${urlError}`}
          </p>
        )}

        <p className="mt-10 max-w-xs text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
