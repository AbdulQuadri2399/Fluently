"use client";

import { archiveProject } from "@/lib/actions/projects";
import * as a from "@/lib/actions/intake";
import { createClient } from "@/lib/supabase/client";
import type { UploadKind } from "@/lib/uploads/rules";
import { BriefPage, type BriefData } from "./BriefPage";

/** Wires the brief screen to the server: uploads go straight from the browser to private storage. */
export function BriefScreen({ data }: { data: BriefData }) {
  const projectId = data.project.id;
  async function uploadFile(kind: UploadKind, file: File) {
    const request = { projectId, kind, fileName: file.name, mime: file.type, size: file.size };
    const url = await a.createUploadUrl(request);
    if (!url.ok) return url;
    const put = await createClient()
      .storage.from("uploads")
      .uploadToSignedUrl(url.data.path, url.data.token, file);
    if (put.error) return { ok: false as const, code: "unavailable" as const };
    return a.confirmUpload({ ...request, path: url.data.path });
  }
  return (
    <BriefPage
      data={data}
      actions={{
        saveField: a.saveIntakeField,
        coach: a.coachField,
        resolve: a.resolveSuggestion,
        uploadFile,
        removeFile: a.removeUpload,
        approve: a.approveObjectives,
        editIntake: a.editApprovedIntake,
        override: a.recordOverride,
        retryEthics: a.retryEthics,
        archive: archiveProject,
      }}
    />
  );
}
