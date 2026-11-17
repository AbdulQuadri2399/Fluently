import { expect, test, type Page } from "@playwright/test";
import { ready } from "./helpers/ready";
import { shoot } from "./helpers/shoot";
import {
  freshWorkspaceAdmin,
  freshWorkspaceUser,
  seedApprovedProject,
  serviceClient,
} from "./helpers/workspace";

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test.describe("Manage a project (AC7.6–AC7.8)", () => {
  test("admin renames from the header, then deletes from the list", async ({ page }) => {
    const who = await freshWorkspaceAdmin();
    const projectId = await seedApprovedProject(who.email);
    const { data: p } = await serviceClient()
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();
    await signIn(page, who);
    await page.goto(`/projects/${projectId}`);
    await ready(page);

    await page.getByRole("button", { name: `Project actions for ${p!.name}` }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByLabel("Project name").fill("Halden ID check");
    await page.getByLabel("Client (optional)").fill("Halden Bank");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Halden ID check", level: 1 })).toBeVisible();
    await expect(page.getByText("· Halden Bank")).toBeVisible();

    await page.goto("/projects");
    await ready(page);
    const row = page.getByRole("row").filter({ hasText: "Halden ID check" });
    await row.hover();
    await row.getByRole("button", { name: "Project actions for Halden ID check" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete Halden ID check?" });
    await dialog.getByLabel("Type the project name to confirm").fill("Halden ID check");
    await shoot(page, "SCR3-delete");
    await dialog.getByRole("button", { name: "Delete project" }).click();
    await expect(page.getByText("Project deleted.")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Halden ID check" })).toHaveCount(0);
    const { data: gone } = await serviceClient().from("projects").select("id").eq("id", projectId);
    expect(gone).toEqual([]);
  });

  test("members can rename and archive, but don't see Delete", async ({ page }) => {
    const who = await freshWorkspaceUser();
    const projectId = await seedApprovedProject(who.email);
    await signIn(page, who);
    await page.goto(`/projects/${projectId}`);
    await ready(page);
    await page.getByRole("button", { name: /^Project actions for / }).click();
    await expect(page.getByRole("menuitem", { name: "Rename" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await expect(page).toHaveURL(/\/projects\?filter=archived$/);
  });
});
