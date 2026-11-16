import { redirect } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");
  return (
    <TooltipProvider>
      <TopBar email={data.user.email ?? ""} />
      <div className="flex flex-1 flex-col">{children}</div>
      <Toaster />
    </TooltipProvider>
  );
}
