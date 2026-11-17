import { expect, test } from "@playwright/test";
import { latestLinkTo } from "./helpers/mail";
import { uniqueEmail } from "./helpers/auth";
import { shoot } from "./helpers/shoot";

test.describe("FL1 first sign-in and onboarding (AC1.1, AC1.3, AC1.6, AC2.1–AC2.3)", () => {
  test("sign up → verify → onboarding on first visit only → help reopens it", async ({ page }) => {
    const email = uniqueEmail();
    const password = "a-long-enough-password";

    await page.goto("/sign-up");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByText("Check your inbox. We've sent a link to confirm your email."),
    ).toBeVisible();

    const link = await latestLinkTo(email);
    await page.goto(link);
    await expect(page).toHaveURL(/\/home$/);

    // First visit: the three-step introduction (AC2.1). Skip records completion (AC2.2).
    const intro = page.getByRole("dialog", { name: "One tree, from brief to wireframe" });
    await expect(intro).toBeVisible();
    await shoot(page, "SCR2-step1");
    await intro.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("dialog", { name: "You decide at every checkpoint" }),
    ).toBeVisible();
    await shoot(page, "SCR2-step2");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("dialog", { name: "Everything traces back" })).toBeVisible();
    await shoot(page, "SCR2-step3");
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // The help button reopens it (AC2.3).
    await page.getByRole("button", { name: "How Fluently works" }).click();
    await expect(
      page.getByRole("dialog", { name: "One tree, from brief to wireframe" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Account" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/home$/);
    // Second visit: no introduction.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("signed-out visit is sent to sign-in and returned afterwards", async ({ page }) => {
    await page.goto("/projects?filter=archived");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fprojects%3Ffilter%3Darchived/);
    await page.getByLabel("Email").fill("member@fluently.test");
    await page.getByLabel("Password").fill("password-dev-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/projects\?filter=archived$/);
  });

  test("wrong password shows the generic message (AC1.4)", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("member@fluently.test");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "That email and password don't match. Check them and try again." }),
    ).toBeVisible();
  });
});
