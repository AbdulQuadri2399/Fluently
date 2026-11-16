import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Verifies email confirmation and recovery links (token-hash flow). FL1 step 2, FF1. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(
        new URL(type === "recovery" ? "/reset/update" : "/projects", origin),
      );
    }
  }
  const expiredType = type === "recovery" ? "recovery" : "signup";
  return NextResponse.redirect(new URL(`/auth/expired?type=${expiredType}`, origin));
}
