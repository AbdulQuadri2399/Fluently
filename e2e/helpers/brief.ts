import { expect, type Page } from "@playwright/test";

/** Adds a pasted email on the brief of an email project (phase 1: a brief needs one to be approved). */
export async function addPastedEmail(page: Page, subject = "Welcome to Examplebank") {
  await page.getByRole("button", { name: "Add email" }).click();
  const dialog = page.getByRole("dialog", { name: "Add an email" });
  await dialog.getByLabel("Subject line").fill(subject);
  await dialog
    .getByLabel("Email HTML")
    .fill(
      '<h1>Welcome</h1><p>Thanks for joining.</p><table><tr><td bgcolor="#1a5fb4" style="background-color:#1a5fb4;padding:12px"><a href="https://example.org/verify">Verify my identity</a></td></tr></table>',
    );
  await dialog.getByRole("button", { name: "Add email" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: subject })).toBeVisible();
}

/** Signs in a fresh workspace's first member, skips the introduction and opens a new project's brief. */
export async function openNewBrief(
  page: Page,
  who: { email: string; password: string },
  mode: "new" | "optimise" = "new",
  withEmail = true,
) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("E2E brief");
  if (mode === "optimise")
    await page.getByRole("radio", { name: /Optimise something that exists/ }).click();
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/brief$/);
  if (withEmail) await addPastedEmail(page);
}
