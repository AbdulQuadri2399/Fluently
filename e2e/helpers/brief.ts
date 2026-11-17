import { expect, type Page } from "@playwright/test";

/** Signs in a fresh workspace's first member, skips the introduction and opens a new project's brief. */
export async function openNewBrief(
  page: Page,
  who: { email: string; password: string },
  mode: "new" | "optimise" = "new",
) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("E2E brief");
  if (mode === "optimise")
    await page.getByRole("radio", { name: /Optimise something that exists/ }).click();
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/brief$/);
}
