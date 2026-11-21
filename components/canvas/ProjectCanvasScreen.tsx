"use client";

import * as canvasActions from "@/lib/actions/canvas";
import * as auditActions from "@/lib/actions/audit";
import * as emailActions from "@/lib/actions/email";
import * as intakeActions from "@/lib/actions/intake";
import type { ProjectTree } from "@/lib/canvas/load";
import { createClient } from "@/lib/supabase/client";
import { ProjectCanvas, type Budget } from "./ProjectCanvas";

/** Wires the tree to the server; files for Add source go straight from the browser to private storage. */
export function ProjectCanvasScreen({ tree, budget }: { tree: ProjectTree; budget?: Budget }) {
  const projectId = tree.project.id;
  return (
    <ProjectCanvas
      tree={tree}
      budget={budget}
      actions={{
        getRunActivity: canvasActions.getRunActivity,
        getTrace: canvasActions.getTrace,
        getEmail: emailActions.getEmailForNode,
        getEmailPreview: emailActions.getEmailPreview,
        emailRender: {
          load: emailActions.getEmailRender,
          render: async (emailId, images) => {
            const res = await fetch("/api/email-render", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ emailId, images }),
            }).catch(() => null);
            if (!res) return { ok: false as const, code: "unavailable" as const };
            return (await res.json().catch(() => ({ ok: false, code: "unavailable" }))) as never;
          },
        },
        emailAudit: {
          load: auditActions.getEmailAudit,
          start: (emailId: string) => auditActions.startQuickAudit(projectId, emailId),
        },
        removeEmail: (emailId: string) => emailActions.removeEmail(projectId, emailId),
        addEmail: {
          addPaste: (subject, html) =>
            emailActions.addEmail({ source: "paste", projectId, subject, html }),
          addFile: async (file, subject) => {
            const request = {
              projectId,
              kind: "asset" as const,
              fileName: file.name,
              mime: file.type,
              size: file.size,
            };
            const signed = await intakeActions.createUploadUrl(request);
            if (!signed.ok) return signed;
            const put = await createClient()
              .storage.from("uploads")
              .uploadToSignedUrl(signed.data.path, signed.data.token, file);
            if (put.error) return { ok: false as const, code: "unavailable" as const };
            const confirmed = await intakeActions.confirmUpload({
              ...request,
              path: signed.data.path,
            });
            if (!confirmed.ok) return confirmed;
            return emailActions.addEmail({
              source: file.name.toLowerCase().endsWith(".eml") ? "eml" : "html",
              projectId,
              uploadId: confirmed.data.id,
              subject: subject.trim() || undefined,
            });
          },
        },
        addNode: canvasActions.addNode,
        deleteNode: canvasActions.deleteNode,
        restoreNode: canvasActions.restoreNode,
        mergeNodes: canvasActions.mergeNodes,
        connectNodes: canvasActions.connectNodes,
        disconnectEdge: canvasActions.disconnectEdge,
        confirmOverCap: canvasActions.confirmOverCap,
        raiseProjectCap: canvasActions.raiseProjectCap,
        startStage: canvasActions.startStage,
        cancelStage: canvasActions.cancelStage,
        reorderNodes: canvasActions.reorderNodes,
        getNodeHistory: canvasActions.getNodeHistory,
        getNodeEvidence: canvasActions.getNodeEvidence,
        moveAssets: canvasActions.moveAssets,
        updateNode: canvasActions.updateNode,
        approveResearch: canvasActions.approveResearch,
        sendBackResearch: canvasActions.sendBackResearch,
        retryResearch: canvasActions.retryResearch,
        addSource: {
          addLink: (url, title) =>
            canvasActions.addSource({ kind: "link", projectId, url, title: title || undefined }),
          addFile: async (file) => {
            const request = {
              projectId,
              kind: "client_data" as const,
              fileName: file.name,
              mime: file.type,
              size: file.size,
            };
            const signed = await intakeActions.createUploadUrl(request);
            if (!signed.ok) return signed;
            const put = await createClient()
              .storage.from("uploads")
              .uploadToSignedUrl(signed.data.path, signed.data.token, file);
            if (put.error) return { ok: false as const, code: "unavailable" as const };
            const confirmed = await intakeActions.confirmUpload({
              ...request,
              path: signed.data.path,
            });
            if (!confirmed.ok) return confirmed;
            return canvasActions.addSource({
              kind: "upload",
              projectId,
              uploadId: confirmed.data.id,
            });
          },
        },
      }}
    />
  );
}
