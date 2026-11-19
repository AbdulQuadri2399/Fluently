"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult, ErrorCode } from "@/lib/actions/result";
import { REQUIRED_SOURCE } from "@/lib/canvas/connect";
import type { ProjectTree } from "@/lib/canvas/load";
import type { AddCardInput } from "./AddCardDialog";
import { canvasCopy as c, typeNames } from "./copy";

export type EditingActions = {
  addNode: (input: AddCardInput & { projectId: string }) => Promise<ActionResult<{ id: string }>>;
  deleteNode: (projectId: string, nodeId: string) => Promise<ActionResult<{ dependents: number }>>;
  restoreNode: (projectId: string, nodeId: string) => Promise<ActionResult>;
  mergeNodes: (
    projectId: string,
    nodeIds: string[],
    title: string,
  ) => Promise<ActionResult<{ id: string }>>;
  connectNodes: (
    projectId: string,
    fromId: string,
    toId: string,
  ) => Promise<ActionResult<{ edgeId: string }>>;
  disconnectEdge: (projectId: string, edgeId: string) => Promise<ActionResult>;
};

/** Add, delete, merge, connect and disconnect (AC24.2–AC24.6, AC30.x) with their toasts and Undo. */
export function useCardEditing(tree: ProjectTree, actions: Partial<EditingActions>) {
  const router = useRouter();
  const projectId = tree.project.id;
  const nodeType = (id: string) => tree.nodes.find((n) => n.id === id)?.type ?? "";
  const nameOf = (type: string) => typeNames[type] ?? type;
  const undoToast = (message: string, undo: () => Promise<boolean>) =>
    toast(message, {
      duration: 10_000,
      action: {
        label: c.editing.undo,
        onClick: () =>
          void undo().then((done) => {
            toast(done ? c.editing.restored : c.editing.undoLate);
            router.refresh();
          }),
      },
    });
  const fail = (code: ErrorCode, specific?: string) =>
    toast.error(
      specific ??
        (code === "locked"
          ? c.editing.locked("research")
          : code === "cant_connect"
            ? c.editing.cantConnect
            : code === "cant_delete_objective"
              ? c.editing.cantDeleteObjective
              : code === "conflict"
                ? c.editing.alreadyConnected
                : code === "validation"
                  ? c.editing.cantDelete
                  : c.editing.saveFailed),
    );

  const onDelete = actions.deleteNode
    ? async (nodeId: string) => {
        const type = nodeType(nodeId);
        const res = await actions.deleteNode!(projectId, nodeId);
        if (!res.ok) {
          fail(res.code);
          return false;
        }
        undoToast(c.editing.deleted(nameOf(type)), async () => {
          const r = await actions.restoreNode?.(projectId, nodeId);
          return Boolean(r?.ok);
        });
        router.refresh();
        return true;
      }
    : undefined;

  const onConnect = actions.connectNodes
    ? async (fromId: string, toId: string) => {
        const res = await actions.connectNodes!(projectId, fromId, toId);
        if (!res.ok) {
          fail(res.code);
          return false;
        }
        undoToast(c.editing.connected, async () => {
          const r = await actions.disconnectEdge?.(projectId, res.data.edgeId);
          return Boolean(r?.ok);
        });
        router.refresh();
        return true;
      }
    : undefined;

  const onDisconnect = actions.disconnectEdge
    ? async (edgeId: string) => {
        const edge = tree.edges.find((e) => e.id === edgeId);
        const res = await actions.disconnectEdge!(projectId, edgeId);
        if (!res.ok) {
          const to = nodeType(edge?.to ?? "");
          fail(
            res.code,
            res.code === "link_required"
              ? c.editing.linkRequired(nameOf(to), nameOf(REQUIRED_SOURCE[to] ?? ""))
              : undefined,
          );
          return false;
        }
        undoToast(c.editing.disconnected, async () => {
          if (!edge) return false;
          const r = await actions.connectNodes?.(projectId, edge.from, edge.to);
          return Boolean(r?.ok);
        });
        router.refresh();
        return true;
      }
    : undefined;

  const onAdd = actions.addNode
    ? async (input: AddCardInput) => {
        const res = await actions.addNode!({ ...input, projectId });
        if (res.ok) {
          toast(c.editing.added(nameOf(input.type)));
          router.refresh();
        }
        return res;
      }
    : undefined;

  const onMerge = actions.mergeNodes
    ? async (ids: string[], title: string) => {
        const res = await actions.mergeNodes!(projectId, ids, title);
        if (res.ok) {
          toast(c.editing.merged);
          router.refresh();
        }
        return res;
      }
    : undefined;

  return { onDelete, onConnect, onDisconnect, onAdd, onMerge, fail };
}
