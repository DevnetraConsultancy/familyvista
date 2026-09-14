"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function GoogleG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.16 7.16 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

interface Props {
  redirectTo?: string;
  className?: string;
  label?: string;
}

export function GoogleSignInButton({
  redirectTo = "/dashboard",
  className,
  label = "Continue with Google",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const signIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        onClick={signIn}
        disabled={loading}
        className="group relative inline-flex h-14 w-full max-w-xs cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full bg-foreground px-8 text-base font-semibold text-background shadow-[0_8px_30px_rgb(0,0,0,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgb(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80 dark:bg-white dark:text-black"
      >
        {/* shimmer sweep */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full dark:via-black/10"
        />
        {/* animated glow ring */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05] opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-40 group-disabled:opacity-30"
        />
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <GoogleG className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            <span className="relative z-10 tracking-tight">{label}</span>
          </>
        )}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
