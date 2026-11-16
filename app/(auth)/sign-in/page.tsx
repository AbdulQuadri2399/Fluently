import { SignInForm } from "@/components/auth/AuthForms";
import { signIn } from "@/lib/actions/auth";
import { safeNext } from "@/lib/schemas/auth";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  return (
    <SignInForm action={signIn} next={safeNext(typeof next === "string" ? next : undefined)} />
  );
}
