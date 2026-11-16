/** Reads the latest email to an address from the local Supabase mail catcher (Mailpit). */
export async function latestLinkTo(email: string, timeoutMs = 15_000): Promise<string> {
  const base = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const body = (await res.json()) as { messages?: { ID: string }[] };
    const id = body.messages?.[0]?.ID;
    if (id) {
      const msg = (await (await fetch(`${base}/api/v1/message/${id}`)).json()) as { HTML: string };
      const href = msg.HTML.match(/href="([^"]+)"/)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email for ${email}`);
}
