"use client";

import { DownloadSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reportCopy as c } from "./copy";

type Format = "md" | "pdf";

/** SCR9 Download (AC15.4): Markdown or PDF; exporting and export-failed states. */
export function DownloadMenu({
  projectId,
  fetcher = fetch,
}: {
  projectId: string;
  fetcher?: typeof fetch;
}) {
  const [state, setState] = useState<"idle" | "exporting" | "failed">("idle");
  const [last, setLast] = useState<Format>("pdf");

  async function download(format: Format) {
    setLast(format);
    setState("exporting");
    try {
      const res = await fetcher(`/projects/${projectId}/report/download?format=${format}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const name =
        /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ??
        `audit-report.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setState("idle");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex items-center gap-2">
      {state === "exporting" ? (
        <span role="status" className="text-small text-muted">
          {c.exporting}
        </span>
      ) : null}
      {state === "failed" ? (
        <span role="alert" className="flex items-center gap-1.5 text-small text-bad">
          <WarningCircleIcon aria-hidden="true" className="size-4" />
          {c.exportFailed}
          <Button variant="ghost" size="sm" onClick={() => void download(last)}>
            {c.retry}
          </Button>
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" disabled={state === "exporting"}>
            <DownloadSimpleIcon aria-hidden="true" />
            {c.download}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void download("md")}>
            {c.downloadMarkdown}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void download("pdf")}>{c.downloadPdf}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
