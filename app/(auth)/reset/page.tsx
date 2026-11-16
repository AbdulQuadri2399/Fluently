import { ResetRequestForm } from "@/components/auth/AuthForms";
import { requestPasswordReset } from "@/lib/actions/auth";

export const metadata = { title: "Reset password" };

export default function ResetPage() {
  return <ResetRequestForm action={requestPasswordReset} />;
}
