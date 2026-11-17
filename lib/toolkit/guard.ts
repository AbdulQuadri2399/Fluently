/** AC4.9, EC2: research needs a pinned toolkit version. Used by startStage before any AI call. */
export function requireToolkit(project: {
  toolkit_version_id: string | null;
}): { ok: true; versionId: string } | { ok: false; code: "no_toolkit" } {
  return project.toolkit_version_id
    ? { ok: true, versionId: project.toolkit_version_id }
    : { ok: false, code: "no_toolkit" };
}

/** EC1: "Toolkit v1 (newer v2 available)" when the workspace default has moved on. */
export function toolkitPin(pinned: number | null, latest: number | null) {
  if (pinned === null) return { pinned: null, newer: null };
  return { pinned, newer: latest !== null && latest > pinned ? latest : null };
}
