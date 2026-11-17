"use server";

import { revalidatePath } from "next/cache";
import * as service from "@/lib/members/service";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(how: "finished" | "skipped") {
  const res = await service.completeOnboarding(await createClient(), how);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
