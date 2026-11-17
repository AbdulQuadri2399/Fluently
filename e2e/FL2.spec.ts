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
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Projects" })
      .click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No projects yet" })).toBeVisible();
    await expect(
      page.getByRole("status").filter({
        hasText: "Research is waiting for the toolkit. Ask your Fluently admin to upload it.",
      }),
    ).toBeVisible();
    await shoot(page, "SCR3-empty");

    await page.getByRole("button", { name: "New project" }).click();
    await page.getByLabel("Project name").fill("Halden onboarding");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/brief$/);
    await expect(page.getByRole("heading", { name: "Halden onboarding" })).toBeVisible();

    // Steps 2–3: write the behavioural objective, leave the field, use the suggestion (AC8.2, AC8.3).
    const behavioural = page.getByLabel("Behavioural objective");
    await behavioural.fill("Upload their ID");
    await behavioural.blur();
    const card = page.getByRole("region", { name: "Suggested: Behavioural objective" });
    await expect(card).toBeVisible();
    await shoot(page, "SCR6-suggestion");
    await card.getByRole("button", { name: "Use suggestion" }).click();
    await expect(behavioural).toHaveValue(/within their first week/);
    await expect(page.getByText("Saved just now")).toBeVisible();

    // Step 4: business objective (keep mine → low specificity), sector, client data (AC8.5, AC8.8).
    const business = page.getByLabel("Business objective");
    await business.fill("Get more people through ID checks");
    await business.blur();
    await page
      .getByRole("region", { name: "Suggested: Business objective" })
      .getByRole("button", { name: "Keep mine" })
      .click();
    await expect(page.getByText("Low specificity", { exact: true })).toBeVisible();
    await page.getByLabel("Sector").selectOption("Banking");
    await page.getByLabel("Add files: Client data (optional)").setInputFiles({
      name: "reviews.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("rating,text\n1,ID check kept failing\n"),
    });
    await expect(page.getByRole("listitem").filter({ hasText: "reviews.csv" })).toBeVisible();
    await shoot(page, "SCR6-default");

    // Steps 5–6: approve → ethics check → passed, ready for research (AC9.2, AC10.2).
    await page.getByRole("button", { name: "Approve objectives" }).click();
    await expect(page.getByText("Ethics check passed", { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Objectives approved and the ethics check passed/)).toBeVisible();
    await shoot(page, "SCR6-approved");
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
