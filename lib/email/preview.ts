/**
 * The page shown inside the email preview frame (04 D38). The frame is sandboxed (no scripts, no
 * forms, no links followed) and this adds a content rule that blocks everything from the network
 * unless the person switched images on. Emails carry their styles inline, so styles from the
 * network are blocked even then.
 */
export function previewDocument(html: string, opts: { images: boolean }): string {
  const csp = [
    "default-src 'none'",
    `img-src data:${opts.images ? " https:" : ""}`,
    "style-src 'unsafe-inline'",
    "font-src data:",
  ].join("; ");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  if (/<head[\s>]/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${meta}`);
  if (/<html[\s>]/i.test(html))
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${meta}</head>`);
  return `<!doctype html><html><head>${meta}<meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`;
}
