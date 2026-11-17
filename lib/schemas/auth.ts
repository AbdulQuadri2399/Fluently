import { z } from "zod";
import { authCopy } from "@/components/auth/copy";

// Shared by the SCR1 forms and the auth Server Actions (O1–O3), so rules can't drift.
export const emailSchema = z
  .email({ error: authCopy.invalidEmail })
  .max(254, authCopy.invalidEmail);
export const passwordSchema = z
  .string()
  .min(12, authCopy.passwordShort)
  .max(72, authCopy.passwordShort);

export const signInSchema = z.object({
  email: emailSchema,
  // Sign-in never reveals password rules (AC1.4); any non-empty value is sent.
  password: z.string().min(1, authCopy.wrongCredentials),
  next: z.string().optional(),
});
export const signUpSchema = z.object({ email: emailSchema, password: passwordSchema });
export const resetRequestSchema = z.object({ email: emailSchema });
export const resetUpdateSchema = z.object({ password: passwordSchema });
export const resendSchema = z.object({ email: emailSchema, type: z.enum(["signup", "recovery"]) });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type ResetUpdateInput = z.infer<typeof resetUpdateSchema>;
export type ResendInput = z.infer<typeof resendSchema>;

/** Only same-site paths are allowed as a post-sign-in destination (AC1.6). */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/home";
  }
  return next;
}
