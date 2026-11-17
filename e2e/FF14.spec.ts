import { expect, test } from "@playwright/test";
import { freshWorkspaceUser, seedApprovedProject } from "./helpers/workspace";

test("FF14 expired session → sign in window → text kept", async ({ page, context }) => {
  const who = await freshWorkspaceUser();
  await seedApprovedProject(who.email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Session test");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/brief$/);

  await page
    .getByLabel("Audience and context")
    .fill("Half-written thought about first-time customers");
  await expect(page.getByText("Saved just now")).toBeVisible();
  await context.clearCookies();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(
    page.getByText(
      "You've been signed out. Sign in again to keep working; nothing you typed is lost.",
    ),
  ).toBeVisible();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email").fill(who.email);
  await dialog.getByLabel("Password").fill(who.password);
  await dialog.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Audience and context")).toHaveValue(
    "Half-written thought about first-time customers",
  );
});
