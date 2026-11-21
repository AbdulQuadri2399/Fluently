import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { linkKey, PHONE_WIDTH } from "./fold";
import type { RawLink, RawText } from "./measure";
import { previewDocument } from "./preview";

/** Runs inside the page: reads the email's own layout and computed styles (no scripts of the email run). */
function collectLayout(): {
  fullHeight: number;
  layoutWidth: number;
  links: RawLink[];
  texts: RawText[];
} {
  const alphaOf = (c: string) => {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return 0;
    const p = m[1]!
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    return p.length > 3 ? p[3]! : 1;
  };
  const bgOf = (el: Element | null): string => {
    for (let e = el; e; e = e.parentElement) {
      const c = getComputedStyle(e).backgroundColor;
      if (alphaOf(c) > 0.5) return c;
    }
    return "rgb(255, 255, 255)";
  };
  const sy = window.scrollY;
  const links = Array.from(document.querySelectorAll("a"))
    .map((a) => {
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      // The button box: the nearest ancestor (or the link itself) whose colour differs from what's behind it.
      let box = r;
      for (let e: Element | null = a, i = 0; e && i < 4; e = e.parentElement, i += 1) {
        if (e === document.body || e === document.documentElement) break;
        if (
          alphaOf(getComputedStyle(e).backgroundColor) > 0.5 &&
          getComputedStyle(e).backgroundColor !== bgOf(e.parentElement)
        ) {
          box = e.getBoundingClientRect();
          break;
        }
      }
      return {
        text:
          (a.textContent ?? "").replace(/\s+/g, " ").trim() ||
          a.querySelector("img")?.getAttribute("alt") ||
          "",
        href: a.getAttribute("href"),
        top: r.top + sy,
        width: r.width,
        height: r.height,
        boxWidth: box.width,
        boxHeight: box.height,
        color: cs.color,
        bg: bgOf(a),
        fontSize: parseFloat(cs.fontSize),
        fontWeight: Number(cs.fontWeight) || 400,
      };
    })
    .filter((l) => l.text && l.href);
  const texts: RawText[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  for (let n = walker.nextNode(); n && texts.length < 400; n = walker.nextNode()) {
    const el = n.parentElement;
    const t = (n.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!el || !t || seen.has(el) || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (
      cs.display === "none" ||
      cs.visibility === "hidden" ||
      Number(cs.opacity) === 0 ||
      r.width === 0 ||
      r.height === 0
    )
      continue;
    seen.add(el);
    texts.push({
      snippet: t.slice(0, 40),
      color: cs.color,
      bg: bgOf(el),
      fontSize: parseFloat(cs.fontSize),
      fontWeight: Number(cs.fontWeight) || 400,
      chars: t.length,
    });
  }
  return {
    fullHeight: Math.ceil(document.documentElement.scrollHeight),
    layoutWidth: Math.ceil(document.documentElement.scrollWidth),
    links,
    texts,
  };
}

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
  /** Where each link starts, in phone pixels. */
  links: { key: string; text: string; href: string | null; top: number }[];
  ms: { launch: number; render: number; total: number };
  browser: string;
  /** Network fetches the request filter blocked, and let through (data: and blank pages aren't counted). */
  requests: { blocked: number; allowed: number };
  /** How each fetch that was let through ended: its status, or why it failed. For diagnosis. */
  fetches: { url: string; status: number | null; error: string | null }[];
  /** Width the email laid itself out at; more than the phone width means it isn't responsive. */
  layoutWidth: number;
  /** Phone pixels per layout pixel (1 unless the email was shrunk to fit). */
  zoom: number;
  /** What the browser measured, in layout pixels; `computeMeasured` turns it into findings. */
  raw: { links: RawLink[]; texts: RawText[]; layoutHeight: number };
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
  const maxHeight = opts.maxHeight ?? 12000;
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
    let measured = await page.evaluate(collectLayout);
    // An email wider than a phone is shrunk to fit, as mail apps do: laid out at its own width, then
    // scaled down. Positions and sizes are reported in layout pixels; `zoom` converts to phone pixels.
    let zoom = 1;
    if (measured.layoutWidth > width + 1) {
      zoom = width / measured.layoutWidth;
      await page.setViewport({
        width: measured.layoutWidth,
        height: Math.round(height / zoom),
        deviceScaleFactor: (opts.scale ?? 1) * zoom,
        isMobile: true,
        hasTouch: true,
      });
      measured = await page.evaluate(collectLayout);
    }
    const layoutW = zoom === 1 ? width : measured.layoutWidth;
    const cutPhone = Math.min(Math.max(Math.round(measured.fullHeight * zoom), height), maxHeight);
    const shot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: layoutW, height: cutPhone / zoom },
      captureBeyondViewport: true,
    });
    const rendered = Date.now();
    return {
      png: Buffer.from(shot),
      width,
      height: cutPhone,
      fullHeight: Math.round(measured.fullHeight * zoom),
      layoutWidth: measured.layoutWidth,
      zoom,
      raw: { links: measured.links, texts: measured.texts, layoutHeight: measured.fullHeight },
      links: measured.links
        .filter((l) => l.text && l.href)
        .map((l) => ({
          key: linkKey(l.text, l.href),
          text: l.text,
          href: l.href,
          top: l.top * zoom,
        })),
      ms: { launch: launched - started, render: rendered - launched, total: rendered - started },
      browser: await browser.version(),
      requests,
      fetches,
    };
  } finally {
    clearTimeout(timer);
    await browser.close().catch(() => undefined);
  }
}
