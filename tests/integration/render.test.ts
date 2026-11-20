import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { linkKey } from "@/lib/email/fold";
import { allowedImageUrl, renderEmail } from "@/lib/email/render";

// Mobile render of an email (AC31.4, AC31.5 positions, 04 D38). Needs a local browser;
// set CHROMIUM_EXECUTABLE_PATH, or it looks in the usual place and skips if there is none.
const CHROME =
  process.env.CHROMIUM_EXECUTABLE_PATH ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
const have = existsSync(CHROME);
const html = readFileSync("fixtures/emails/welcome.html", "utf8");

describe("allowedImageUrl", () => {
  it("only public https addresses", () => {
    expect(allowedImageUrl("https://example.org/a.png")).toBe(true);
    expect(allowedImageUrl("https://cdn.example.co.uk/img/a.jpg?x=1")).toBe(true);
    for (const bad of [
      "http://example.org/a.png",
      "https://127.0.0.1/a.png",
      "https://10.0.0.5/a.png",
      "https://[::1]/a.png",
      "https://localhost/a.png",
      "https://printer.local/a.png",
      "https://db.internal/a.png",
      "https://example.org:8443/a.png",
      "https://intranet/a.png",
      "file:///etc/passwd",
      "not a url",
    ])
      expect(allowedImageUrl(bad), bad).toBe(false);
  });
});

describe.skipIf(!have)("renderEmail (local browser)", () => {
  let hits: string[] = [];
  let server: ReturnType<typeof createServer>;
  let base = "";

  beforeAll(async () => {
    process.env.CHROMIUM_EXECUTABLE_PATH = CHROME;
    server = createServer((req, res) => {
      hits.push(req.url ?? "");
      res.writeHead(200, { "content-type": "image/gif" });
      res.end(Buffer.from("R0lGODlhAQABAAAAACw=", "base64"));
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    server.close();
  });

  it("makes a phone-width PNG and says where each link sits", async () => {
    const r = await renderEmail({ html });
    expect(r.png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(r.width).toBe(375);
    expect(r.height).toBeGreaterThanOrEqual(800);
    const top = (text: string, href: string) =>
      r.links.find((l) => l.key === linkKey(text, href))!.top;
    expect(top("Verify my identity", "https://example.org/verify")).toBeLessThan(650);
    expect(r.links.some((l) => l.text === "Unsubscribe")).toBe(true);
    expect(r.ms.total).toBeGreaterThan(0);
  }, 60_000);

  it("lays out at the phone's width, and notices an email that won't fit", async () => {
    const wrapped = await renderEmail({
      html: "<p>" + "A fairly long sentence that has to wrap. ".repeat(20) + "</p>",
    });
    expect(wrapped.layoutWidth).toBeLessThanOrEqual(375);
    // A fixed 600 px email (very common) is wider than a phone: the report can say it isn't responsive.
    const fixed = await renderEmail({
      html: '<table width="600"><tr><td>Fixed width email</td></tr></table>',
    });
    expect(fixed.layoutWidth).toBeGreaterThanOrEqual(600);
  }, 60_000);

  it("a long email is cut at the maximum height", async () => {
    const tall = `<p>Top</p><div style="height:6000px"></div><p>Bottom</p>`;
    const r = await renderEmail({ html: tall, maxHeight: 2000 });
    expect(r.fullHeight).toBeGreaterThan(6000);
    expect(r.height).toBe(2000);
  }, 60_000);

  it("fetches nothing from the internet by default, however the email asks", async () => {
    hits = [];
    const sneaky = `<img src="${base}/pixel.gif"><link rel="stylesheet" href="${base}/a.css"><script src="${base}/a.js"></script><iframe src="${base}/f"></iframe><p style="background:url(${base}/bg.gif)">Hi</p>`;
    const r = await renderEmail({ html: sneaky });
    // The page's own content rule stops these first; the request filter is a second lock behind it.
    expect(hits).toEqual([]);
    expect(r.requests.allowed).toBe(0);
  }, 60_000);

  it("with images on, only addresses the rule allows are fetched, and only images", async () => {
    hits = [];
    const html2 = `<img src="${base}/pixel.gif"><link rel="stylesheet" href="${base}/a.css"><script src="${base}/a.js"></script>`;
    await renderEmail({ html: html2, images: true, allowImage: () => true });
    // The content rule in the page allows only https images, so a plain-http local address stays blocked.
    expect(hits).toEqual([]);
    await renderEmail({ html: html2, images: true });
    expect(hits).toEqual([]);
  }, 60_000);

  it("scripts in the email never run", async () => {
    const r = await renderEmail({
      html: `<p id="t">before</p><script>document.getElementById("t").textContent="AFTER"</script>`,
    });
    // The picture can't be read here, but the links list proves the page ran no script: add a link via script.
    const r2 = await renderEmail({
      html: `<script>document.body.insertAdjacentHTML("beforeend",'<a href="https://x.test/injected">Injected</a>')</script><p>Hi</p>`,
    });
    expect(r.png.length).toBeGreaterThan(100);
    expect(r2.links.map((l) => l.text)).not.toContain("Injected");
  }, 60_000);
});
