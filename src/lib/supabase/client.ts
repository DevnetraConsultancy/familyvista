"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        // The server /auth/callback route performs the code exchange
        // authoritatively. The browser client must NOT also try to consume
        // `?code=` from the URL (double-exchange caused flaky logins that
        // surfaced as "pick your Google account twice").
        detectSessionInUrl: false,
        autoRefreshToken: true,
        persistSession: true,
      },
    }
  );
}
