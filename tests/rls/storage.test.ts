import { beforeAll, describe, expect, it } from "vitest";
import { anonClient, createIsolatedUser } from "../helpers/supabase";

// Private "uploads" bucket: files live under <workspace_id>/…; only that workspace can use them.
describe("RLS storage uploads bucket", () => {
  let a: Awaited<ReturnType<typeof createIsolatedUser>>;
  let b: Awaited<ReturnType<typeof createIsolatedUser>>;
  let path: string;

  beforeAll(async () => {
    a = await createIsolatedUser();
    b = await createIsolatedUser();
    path = `${a.workspaceId}/${crypto.randomUUID()}/notes.txt`;
  });

  it("member uploads and downloads in their own workspace folder", async () => {
    const up = await a.client.storage
      .from("uploads")
      .upload(path, new Blob(["hello"], { type: "text/plain" }));
    expect(up.error).toBeNull();
    const down = await a.client.storage.from("uploads").download(path);
    expect(await down.data?.text()).toBe("hello");
  });

  it("another workspace can't read, write into, or delete from that folder", async () => {
    expect((await b.client.storage.from("uploads").download(path)).error).not.toBeNull();
    const up = await b.client.storage
      .from("uploads")
      .upload(`${a.workspaceId}/x/evil.txt`, new Blob(["x"]));
    expect(up.error).not.toBeNull();
    const rm = await b.client.storage.from("uploads").remove([path]);
    expect(rm.data ?? []).toHaveLength(0);
    expect((await a.client.storage.from("uploads").download(path)).error).toBeNull();
  });

  it("signed-out visitors can't read it, and folders that aren't a workspace are refused", async () => {
    expect((await anonClient().storage.from("uploads").download(path)).error).not.toBeNull();
    expect(
      (await a.client.storage.from("uploads").upload("not-a-workspace/x.txt", new Blob(["x"])))
        .error,
    ).not.toBeNull();
  });
});
