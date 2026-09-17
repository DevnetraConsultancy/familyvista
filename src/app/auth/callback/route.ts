import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const oauthError = searchParams.get("error");

  // Provider returned an error (e.g. access_denied)
  if (oauthError) {
    console.error(
      "OAuth provider error:",
      oauthError,
      searchParams.get("error_description")
    );
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}`
    );
  }

  if (code) {
    // Sanitize the destination: keep only the pathname (strip any ?code=,
    // ?state= or error params that could leak into the app URL bar).
    let safeNext = "/dashboard";
    try {
      const parsed = new URL(next, origin);
      if (parsed.origin === origin) safeNext = parsed.pathname || "/dashboard";
    } catch {
      safeNext = "/dashboard";
    }

    // Build the success response FIRST, then let the Supabase client attach
    // its auth cookies to that response so they actually reach the browser.
    const response = NextResponse.redirect(`${origin}${safeNext}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Code exchange failed:", error.message);
      return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
    }

    return response;
  }

  // No code param — nothing to exchange
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
