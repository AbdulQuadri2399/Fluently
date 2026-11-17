import { expect, test } from "@playwright/test";
import { SEEDED, signIn } from "./helpers/auth";
import { shoot } from "./helpers/shoot";
import { freshWorkspaceUser } from "./helpers/workspace";

test.describe("FL2 create a project (AC7.1, AC7.3)", () => {
  test("create project from empty state opens intake route", async ({ page }) => {
    const who = await freshWorkspaceUser();
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(who.email);
    await page.getByLabel("Password").fill(who.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.getByRole("button", { name: "Skip" }).click();

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Projects" })
      .click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No projects yet" })).toBeVisible();
    await expect(
      page
        .getByRole("status")
        .filter({
          hasText: "Research is waiting for the toolkit. Ask your Fluently admin to upload it.",
        }),
    ).toBeVisible();
    await shoot(page, "SCR3-empty");

    await page.getByRole("button", { name: "New project" }).click();
    await page.getByLabel("Project name").fill("Halden onboarding");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Halden onboarding" })).toBeVisible();
  });

  test("home and projects list for a returning member", async ({ page }) => {
    await signIn(page, SEEDED.member);
    await expect(page.getByRole("heading", { name: "Waiting for you" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Review Northbank KYC completion" })).toBeVisible();
    await shoot(page, "SCR3-home");

    await page.goto("/projects");
    await expect(page.getByRole("table")).toBeVisible();
    await shoot(page, "SCR3-default");
    await page.getByRole("searchbox", { name: "Search projects" }).fill("zzz-nothing");
    await page.keyboard.press("Enter");
    await expect(page.getByText("No projects match that search.")).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByRole("table")).toBeVisible();
  });
});
