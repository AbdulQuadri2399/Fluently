"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "./result";
import {
  resendSchema,
  resetRequestSchema,
  resetUpdateSchema,
  safeNext,
  signInSchema,
  signUpSchema,
  type ResendInput,
  type ResetRequestInput,
  type ResetUpdateInput,
  type SignInInput,
  type SignUpInput,
} from "@/lib/schemas/auth";

async function confirmUrl(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host") ?? "localhost:3000"}`;
  return `${origin}/auth/confirm`;
}

async function isAllowed(email: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_email_allowed", { email });
  return !error && data === true;
}

/** O1 signUp (AC1.1, AC1.2). The database trigger refuses non-allowlisted emails too (D13). */
export async function signUp(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const { email, password } = parsed.data;
  if (!(await isAllowed(email))) return fail("forbidden");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await confirmUrl() },
  });
  if (error) return fail(error.code === "unexpected_failure" ? "forbidden" : "unavailable");
  return ok(undefined);
}

/** O2 signIn (AC1.3, AC1.4, AC1.6). One generic message for any wrong email or password. */
export async function signIn(input: SignInInput): Promise<ActionResult<{ next: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return fail(error.code === "email_not_confirmed" ? "unconfirmed" : "validation");
  return ok({ next: safeNext(parsed.data.next) });
}

/** O2 signOut. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}

/** O3 requestPasswordReset (AC1.5): always reports success, only emails allowlisted addresses. */
export async function requestPasswordReset(input: ResetRequestInput): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  if (await isAllowed(parsed.data.email)) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: await confirmUrl(),
    });
  }
  return ok(undefined);
}

/** O3 updatePassword, used after following a recovery link. */
export async function updatePassword(
  input: ResetUpdateInput,
): Promise<ActionResult<{ next: string }>> {
  const parsed = resetUpdateSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.code === "session_not_found" ? "forbidden" : "unavailable");
  return ok({ next: "/home" });
}

/** Resend an expired confirmation or reset link (SCR1 · link expired). */
export async function resendLink(input: ResendInput): Promise<ActionResult> {
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) return fail("validation");
  const { email, type } = parsed.data;
  if (type === "recovery") return requestPasswordReset({ email });
  if (await isAllowed(email)) {
    const supabase = await createClient();
    await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: await confirmUrl() },
    });
  }
  return ok(undefined);
}
