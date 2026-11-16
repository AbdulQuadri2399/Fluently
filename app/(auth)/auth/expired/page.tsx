import { LinkExpiredForm } from "@/components/auth/AuthForms";
import { resendLink } from "@/lib/actions/auth";

export const metadata = { title: "Link expired" };

export default async function LinkExpiredPage({ searchParams }: PageProps<"/auth/expired">) {
  const { type } = await searchParams;
  return <LinkExpiredForm type={type === "recovery" ? "recovery" : "signup"} action={resendLink} />;
}
