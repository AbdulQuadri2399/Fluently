// Minimal .eml reader (AC8.6): finds the subject and the HTML body, decoding quoted-printable
// and base64 parts. Enough for email exports from common clients; not a full MIME parser.

type Part = { headers: Record<string, string>; body: string };

function splitHeaders(raw: string): Part {
  const text = raw.replace(/\r\n/g, "\n");
  const end = text.indexOf("\n\n");
  const head = end < 0 ? text : text.slice(0, end);
  const body = end < 0 ? "" : text.slice(end + 2);
  const headers: Record<string, string> = {};
  let last = "";
  for (const line of head.split("\n")) {
    if (/^\s/.test(line) && last) headers[last] += " " + line.trim();
    else {
      const i = line.indexOf(":");
      if (i > 0) {
        last = line.slice(0, i).trim().toLowerCase();
        headers[last] = line.slice(i + 1).trim();
      }
    }
  }
  return { headers, body };
}

function decodeBody(part: Part): string {
  const enc = (part.headers["content-transfer-encoding"] ?? "").toLowerCase();
  if (enc === "base64")
    return Buffer.from(part.body.replace(/\s+/g, ""), "base64").toString("utf8");
  if (enc === "quoted-printable") {
    const soft = part.body.replace(/=\n/g, "");
    const bytes = soft.replace(/=([0-9A-Fa-f]{2})/g, (_, h: string) =>
      String.fromCharCode(parseInt(h, 16)),
    );
    return Buffer.from(bytes, "latin1").toString("utf8");
  }
  return part.body;
}

/** Decodes "=?utf-8?Q?...?=" and "=?utf-8?B?...?=" words in headers. */
function decodeHeader(value: string): string {
  return value.replace(
    /=\?([^?]+)\?([QBqb])\?([^?]*)\?=/g,
    (_, _cs: string, enc: string, data: string) => {
      if (enc.toUpperCase() === "B") return Buffer.from(data, "base64").toString("utf8");
      const qp = data
        .replace(/_/g, " ")
        .replace(/=([0-9A-Fa-f]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
      return Buffer.from(qp, "latin1").toString("utf8");
    },
  );
}

function findHtml(part: Part): string | null {
  const type = (part.headers["content-type"] ?? "text/plain").toLowerCase();
  if (type.startsWith("text/html")) return decodeBody(part).trim();
  const boundary = /boundary="?([^";]+)"?/i.exec(part.headers["content-type"] ?? "")?.[1];
  if (!type.startsWith("multipart/") || !boundary) return null;
  for (const chunk of part.body.split(`--${boundary}`).slice(1)) {
    if (chunk.startsWith("--")) break;
    const html = findHtml(splitHeaders(chunk.replace(/^\n/, "")));
    if (html) return html;
  }
  return null;
}

export function parseEml(raw: string): { subject: string; html: string | null } {
  const top = splitHeaders(raw);
  return { subject: decodeHeader(top.headers.subject ?? ""), html: findHtml(top) };
}
