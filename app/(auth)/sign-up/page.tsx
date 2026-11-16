import { SignUpForm } from "@/components/auth/AuthForms";
import { signUp } from "@/lib/actions/auth";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return <SignUpForm action={signUp} />;
}
