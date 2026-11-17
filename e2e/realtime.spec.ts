import { expect, test } from "@playwright/test";
import { freshWorkspaceUser, seedApprovedProject, serviceClient } from "./helpers/workspace";

test("node inserted by server appears within 5 s without reload (AC11.2, AC22.3)", async ({
  page,
}) => {
  const who = await freshWorkspaceUser();
  const projectId = await seedApprovedProject(who.email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByText("Upload ID on day one")).toBeVisible();
  await page.waitForTimeout(1000); // let the live channel connect

  const db = serviceClient();
  const { data: p } = await db.from("projects").select("workspace_id").eq("id", projectId).single();
  await db.from("nodes").insert({
    workspace_id: p!.workspace_id,
    project_id: projectId,
    type: "source",
    stage: "research",
    title: "Arrived live · 3 found",
    data: {},
  });
  await expect(page.getByText("Arrived live · 3 found")).toBeVisible({ timeout: 5000 });
});
