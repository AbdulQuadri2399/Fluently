"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import * as service from "@/lib/toolkit/service";

export async function saveToolkitVersion(input: service.SaveToolkitInput) {
  const res = await service.saveToolkitVersion(await createClient(), input);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
