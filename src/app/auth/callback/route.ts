import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const oauthError = searchParams.get("error");

  // Provider returned an error (e.g. access_denied)
  if (oauthError) {
    console.error("OAuth provider error:", oauthError, searchParams.get("error_description"));
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    // IMPORTANT: build the success response FIRST, then let the Supabase
    // client attach its auth cookies to that response. Previously the
    // cookies were set on the request object and never reached the
    // browser, so the user appeared logged out and was bounced back
    // to /login by the middleware.
    const response = NextResponse.redirect(`${origin}${next}`);

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
