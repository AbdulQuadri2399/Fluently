import { ResetUpdateForm } from "@/components/auth/AuthForms";
import { updatePassword } from "@/lib/actions/auth";

export const metadata = { title: "Choose a new password" };

export default function ResetUpdatePage() {
  return <ResetUpdateForm action={updatePassword} />;
}
