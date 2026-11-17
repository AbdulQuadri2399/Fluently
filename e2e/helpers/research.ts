import { expect, type Page } from "@playwright/test";
import { ready } from "./ready";
import { freshWorkspaceAdmin, seedApprovedProject, serviceClient } from "./workspace";

/** A fresh admin with the sample toolkit and a project ready for research, opened on its canvas. */
export async function openReadyForResearch(page: Page, brief?: string) {
  const who = await freshWorkspaceAdmin();
  const projectId = await seedApprovedProject(who.email);
  if (brief)
    await serviceClient()
      .from("intakes")
      .update({ audience_context: brief })
      .eq("project_id", projectId);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.goto("/toolkit");
  await ready(page);
  await page.getByLabel("Upload toolkit").setInputFiles("fixtures/toolkit/sample-toolkit.csv");
  await page.getByRole("button", { name: /^Save as version \d+$/ }).click();
  await expect(page.getByText(/Toolkit version \d+ saved/)).toBeVisible();
  await page.goto(`/projects/${projectId}`);
  await ready(page);
  return projectId;
}
