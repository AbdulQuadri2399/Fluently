import { describe, expect, it } from "vitest";
import { requireToolkit, toolkitPin } from "@/lib/toolkit/guard";

describe("requireToolkit (AC4.9, EC2)", () => {
  it("no version → no_toolkit", () => {
    expect(requireToolkit({ toolkit_version_id: null })).toEqual({ ok: false, code: "no_toolkit" });
  });
  it("pinned version → ok", () => {
    expect(requireToolkit({ toolkit_version_id: "v1" })).toEqual({ ok: true, versionId: "v1" });
  });
  it("EC1: shows a newer version only when the default has moved on", () => {
    expect(toolkitPin(1, 2)).toEqual({ pinned: 1, newer: 2 });
    expect(toolkitPin(2, 2)).toEqual({ pinned: 2, newer: null });
    expect(toolkitPin(null, 2)).toEqual({ pinned: null, newer: null });
  });
});
