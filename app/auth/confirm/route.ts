import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies email confirmation and password-recovery links. FL1 step 2, FF1.
 * Two link styles arrive here:
 * - token_hash + type: our own email templates (local stack, or a project with custom SMTP).
 * - code: Supabase's default templates (free plan), after Supabase has verified the email (PKCE).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(
        new URL(type === "recovery" ? "/reset/update" : "/home", origin),
      );
    }
    const expiredType = type === "recovery" ? "recovery" : "signup";
    return NextResponse.redirect(new URL(`/auth/expired?type=${expiredType}`, origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getClaims();
      const amr = (data?.claims?.amr ?? []) as Array<{ method?: string }>;
      const isRecovery = amr.some((m) => m.method === "recovery");
      return NextResponse.redirect(new URL(isRecovery ? "/reset/update" : "/home", origin));
    }
    // The link was opened in a different browser from the one that signed up. Supabase has
    // already confirmed the email, so the person can sign in normally.
    return NextResponse.redirect(new URL("/sign-in", origin));
  }

  return NextResponse.redirect(new URL("/auth/expired?type=signup", origin));
}
