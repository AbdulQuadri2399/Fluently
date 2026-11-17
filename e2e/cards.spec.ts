import { expect, test } from "@playwright/test";
import { ready } from "./helpers/ready";
import { freshWorkspaceUser, seedApprovedProject, serviceClient } from "./helpers/workspace";

async function openSeeded(page: import("@playwright/test").Page) {
  const who = await freshWorkspaceUser();
  const projectId = await seedApprovedProject(who.email);
  const db = serviceClient();
  const { data: p } = await db.from("projects").select("workspace_id").eq("id", projectId).single();
  const { data: objs } = await db
    .from("nodes")
    .select("id")
    .eq("project_id", projectId)
    .eq("type", "objective");
  const groups = [
    { key: "papers", title: "Academic papers", count: 12, status: "done" },
    { key: "web", title: "Web and market", count: 8, status: "done" },
  ];
  const { data: src } = await db
    .from("nodes")
    .insert({
      workspace_id: p!.workspace_id,
      project_id: projectId,
      type: "source",
      stage: "research",
      title: "Research sources",
      data: { groups },
      provenance: "ai",
      sort_order: 0,
    })
    .select("id")
    .single();
  await db.from("edges").insert(
    objs!.map((o) => ({
      workspace_id: p!.workspace_id,
      project_id: projectId,
      from_id: o.id,
      to_id: src!.id,
    })),
  );
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.goto(`/projects/${projectId}`);
  await ready(page);
  return { projectId, sourceId: src!.id as string };
}

test.describe("Cards: expand, edit (AC22.9, AC24.1, MI13, MI6)", () => {
  test("a card expands in place, and cards below make room", async ({ page }) => {
    await openSeeded(page);
    const card = page.locator(".react-flow__node").filter({ hasText: "Research sources" });
    await expect(card.getByText("Academic papers")).toHaveCount(0);
    await card.getByRole("button", { name: "Expand card" }).click();
    await expect(card.getByText("Academic papers")).toBeVisible();
    await expect(card.getByText("12")).toBeVisible();

    const ethics = page.locator(".react-flow__node").filter({ hasText: "Ethics check" });
    const before = (await ethics.boundingBox())!.y;
    await page
      .locator(".react-flow__node")
      .filter({ hasText: "Raise ID checks by 15%" })
      .getByRole("button", { name: "Expand card" })
      .click();
    await ethics.getByRole("button", { name: "Expand card" }).click();
    await expect(ethics.getByText("No rules broken.")).toBeVisible();
    expect((await ethics.boundingBox())!.y).toBeGreaterThanOrEqual(before);
    await card.getByRole("button", { name: "Collapse card" }).click();
    await expect(card.getByText("Academic papers")).toHaveCount(0);
  });

  test("edit a card after a run: saved, marked edited by a person, history updated", async ({
    page,
  }) => {
    await openSeeded(page);
    await page.getByText("Research sources").click();
    const panel = page.getByRole("complementary", { name: "Source" });
    await panel.getByRole("button", { name: "Edit" }).click();
    await panel.getByLabel("Title").fill("Sources, checked by Ada");
    await panel.getByLabel("Notes").fill("Two duplicate papers removed.");
    await panel.getByRole("button", { name: "Save" }).click();
    await expect(
      page.locator(".react-flow__node").filter({ hasText: "Sources, checked by Ada" }),
    ).toBeVisible();
    await expect(panel.getByText("AI, edited by a person")).toBeVisible();
    await expect(panel.getByText("Two duplicate papers removed.")).toBeVisible();
    await panel.getByText("History").click();
    await expect(panel.getByText(/^Edited · /)).toBeVisible();

    // Objectives point to the brief instead.
    await page.locator(".react-flow__node").filter({ hasText: "Raise ID checks by 15%" }).click();
    await expect(page.getByText("Objectives are edited in the brief.")).toBeVisible();
  });
});
