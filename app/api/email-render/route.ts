import { z } from "zod";
import { renderAndStore } from "@/lib/email/renderService";
import { createClient } from "@/lib/supabase/server";

// O38 (04 D38): renders one email and stores it. A route, not a server action, so it can run as
// long as a render needs on the hosting (a cold start takes a few seconds).
export const maxDuration = 60;

const body = z.object({ emailId: z.uuid(), images: z.boolean() });

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, code: "validation" }, { status: 400 });
  const res = await renderAndStore(await createClient(), parsed.data);
  if (res.ok) return Response.json(res);
  const status = res.code === "forbidden" ? 403 : res.code === "not_found" ? 404 : 500;
  return Response.json(res, { status });
}
