/**
 * The page shown inside the email preview frame (04 D38). The frame is sandboxed (no scripts, no
 * forms, no links followed) and this adds a content rule that blocks everything from the network
 * unless the person switched images on. Emails carry their styles inline, so styles from the
 * network are blocked even then.
 */
export function previewDocument(
  html: string,
  opts: { images: boolean; foldAt?: number; foldLabel?: string },
): string {
  const csp = [
    "default-src 'none'",
    `img-src data:${opts.images ? " https:" : ""}`,
    "style-src 'unsafe-inline'",
    "font-src data:",
  ].join("; ");
  // Mail apps lay an email out at the phone's width; without this a browser would use a desktop width.
  // `foldAt` draws a dashed line that scrolls with the email, at the end of the first phone screen.
  const fold = opts.foldAt === undefined ? "" : `<style>html{position:relative}</style>`;
  const marker =
    opts.foldAt === undefined
      ? ""
      : `<div data-fold style="position:absolute;left:0;right:0;top:${opts.foldAt}px;height:0;border-top:1px dashed rgba(0,0,0,.55);z-index:2147483647;pointer-events:none"><span style="position:absolute;right:4px;top:2px;font:11px/1 system-ui,sans-serif;color:#555;background:rgba(255,255,255,.85);padding:2px 4px;border-radius:3px">${opts.foldLabel ?? ""}</span></div>`;
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width, initial-scale=1">${fold}`;
  let doc: string;
  if (/<head[\s>]/i.test(html)) doc = html.replace(/<head([^>]*)>/i, `<head$1>${meta}`);
  else if (/<html[\s>]/i.test(html))
    doc = html.replace(/<html([^>]*)>/i, `<html$1><head>${meta}</head>`);
  else doc = `<!doctype html><html><head>${meta}</head><body>${html}</body></html>`;
  if (!marker) return doc;
  return /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${marker}</body>`) : doc + marker;
}
