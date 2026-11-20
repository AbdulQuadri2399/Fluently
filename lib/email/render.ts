import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { linkKey, PHONE_WIDTH } from "./fold";
import { previewDocument } from "./preview";

// Mobile render of an email (AC31.4, 04 D38): a hidden browser lays the email out at phone width,
// takes a picture and reads where each link sits. Runs in a serverless function (Chromium from
// @sparticuz/chromium); locally it uses the browser named in CHROMIUM_EXECUTABLE_PATH.

export type RenderOptions = {
  html: string;
  /** Let the email's own https images load (IB19). Off by default. */
  images?: boolean;
  width?: number;
  /** Height of the first screen; the picture is cut at `maxHeight`. */
  height?: number;
  maxHeight?: number;
  scale?: number;
  /** Which image addresses may load when images are on. Replaceable in tests. */
  allowImage?: (url: string) => boolean;
  timeoutMs?: number;
};

export type RenderedEmail = {
  png: Buffer;
  width: number;
  /** Height of the picture, and of the whole email before it was cut. */
  height: number;
  fullHeight: number;
  links: { key: string; text: string; href: string | null; top: number }[];
  ms: { launch: number; render: number; total: number };
  browser: string;
  /** Network fetches the request filter blocked, and let through (data: and blank pages aren't counted). */
  requests: { blocked: number; allowed: number };
  /** How each fetch that was let through ended: its status, or why it failed. For diagnosis. */
  fetches: { url: string; status: number | null; error: string | null }[];
  /** Width the email laid itself out at; more than the phone width means it isn't responsive. */
  layoutWidth: number;
};

/** Public https images only: no addresses written as numbers, no local or internal names. */
export function allowedImageUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || (u.port && u.port !== "443")) return false;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("["))
    return false;
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(host)) return false;
  return true;
}

export async function renderEmail(opts: RenderOptions): Promise<RenderedEmail> {
  const started = Date.now();
  const width = opts.width ?? PHONE_WIDTH;
  const height = opts.height ?? 800;
  const maxHeight = opts.maxHeight ?? 4000;
  const images = opts.images ?? false;
  const allow = opts.allowImage ?? allowedImageUrl;
  const local = process.env.CHROMIUM_EXECUTABLE_PATH;

  const browser = await puppeteer.launch({
    args: local ? ["--no-sandbox", "--disable-gpu"] : chromium.args,
    executablePath: local ?? (await chromium.executablePath()),
    headless: local ? true : "shell",
  });
  const launched = Date.now();
  const timer = setTimeout(
    () => void browser.close().catch(() => undefined),
    opts.timeoutMs ?? 30_000,
  );
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: opts.scale ?? 1,
      isMobile: true,
      hasTouch: true,
    });
    const requests = { blocked: 0, allowed: 0 };
    const fetches: RenderedEmail["fetches"] = [];
    page.on("response", (res) => {
      const url = res.url();
      if (url.startsWith("http")) fetches.push({ url, status: res.status(), error: null });
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (url.startsWith("http"))
        fetches.push({ url, status: null, error: req.failure()?.errorText ?? "failed" });
    });
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      const fine =
        url.startsWith("data:") ||
        url === "about:blank" ||
        (images && req.resourceType() === "image" && allow(url));
      if (fine) {
        if (url.startsWith("http")) requests.allowed += 1; // only real network fetches count
        void req.continue();
      } else {
        requests.blocked += 1;
        void req.abort("blockedbyclient");
      }
    });
    await page.setContent(previewDocument(opts.html, { images }), {
      waitUntil: "load", // the load event also waits for any images that are allowed
      timeout: 15_000,
    });
    const measured = await page.evaluate(() => ({
      fullHeight: Math.ceil(document.documentElement.scrollHeight),
      layoutWidth: Math.ceil(document.documentElement.scrollWidth),
      links: Array.from(document.querySelectorAll("a")).map((a) => ({
        text:
          (a.textContent ?? "").replace(/\s+/g, " ").trim() ||
          a.querySelector("img")?.getAttribute("alt") ||
          "",
        href: a.getAttribute("href"),
        top: a.getBoundingClientRect().top + window.scrollY,
      })),
    }));
    const cut = Math.min(Math.max(measured.fullHeight, height), maxHeight);
    const shot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width, height: cut },
      captureBeyondViewport: true,
    });
    const rendered = Date.now();
    return {
      png: Buffer.from(shot),
      width,
      height: cut,
      fullHeight: measured.fullHeight,
      links: measured.links
        .filter((l) => l.text && l.href)
        .map((l) => ({ ...l, key: linkKey(l.text, l.href) })),
      ms: { launch: launched - started, render: rendered - launched, total: rendered - started },
      browser: await browser.version(),
      requests,
      fetches,
      layoutWidth: measured.layoutWidth,
    };
  } finally {
    clearTimeout(timer);
    await browser.close().catch(() => undefined);
  }
}
