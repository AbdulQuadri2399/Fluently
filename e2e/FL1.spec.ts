import { expect, test } from "@playwright/test";
import { latestLinkTo } from "./helpers/mail";
import { uniqueEmail } from "./helpers/auth";

test.describe("FL1 first sign-in (AC1.1, AC1.3, AC1.6)", () => {
  test("sign up → verify via local mail catcher → sign in → lands on /projects", async ({
    page,
  }) => {
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
    await expect(page).toHaveURL(/\/projects$/);

    await page.getByRole("button", { name: "Account" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/projects$/);
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
