// Upload rules (AC8.6–AC8.8, FF3). Shared by the brief screen and the server checks.

export type UploadKind = "asset" | "client_data";
export type Channel = "screens" | "email";

type Rule = {
  extensions: string[];
  maxBytes: number;
  maxFiles: number;
  label: string;
  sizeLabel: string;
};

const MB = 1024 * 1024;
const IMAGES = ["png", "jpg", "jpeg", "webp"];

export function uploadRule(kind: UploadKind, channel: Channel): Rule {
  if (kind === "client_data") {
    return {
      extensions: ["csv", "txt", "pdf", "xlsx"],
      maxBytes: 20 * MB,
      maxFiles: 10,
      label: "CSV, TXT, PDF or XLSX",
      sizeLabel: "20 MB",
    };
  }
  return channel === "email"
    ? {
        extensions: ["html", "htm", "eml", ...IMAGES],
        maxBytes: 10 * MB,
        maxFiles: 20,
        label: "HTML, EML, PNG, JPG or WebP",
        sizeLabel: "10 MB",
      }
    : {
        extensions: IMAGES,
        maxBytes: 10 * MB,
        maxFiles: 20,
        label: "PNG, JPG or WebP",
        sizeLabel: "10 MB",
      };
}

export function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i < 0 ? "" : fileName.slice(i + 1).toLowerCase();
}

export function checkFile(
  file: { name: string; size: number },
  kind: UploadKind,
  channel: Channel,
): "ok" | "typeOrSize" {
  const rule = uploadRule(kind, channel);
  if (!rule.extensions.includes(extensionOf(file.name))) return "typeOrSize";
  if (file.size <= 0 || file.size > rule.maxBytes) return "typeOrSize";
  return "ok";
}

/** Storage-safe file name: keeps letters, digits, dot, dash and underscore. */
export function safeName(fileName: string): string {
  const cleaned = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-");
  return cleaned.slice(-120) || "file";
}
