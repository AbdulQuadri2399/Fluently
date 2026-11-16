import { expect, test } from "@playwright/test";
import { uniqueEmail } from "./helpers/auth";

test.describe("FF1 sign-up refused / expired link (AC1.2)", () => {
  test("non-allowlisted sign-up shows auth.notAllowed", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Email").fill(uniqueEmail("not-invited.example"));
    await page.getByLabel("Password").fill("a-long-enough-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByRole("alert").filter({
        hasText: "This email isn't on Fluently's invite list. Ask your Fluently admin to add you.",
      }),
    ).toBeVisible();
  });

  test("expired or invalid link shows auth.linkExpired with Send a new link", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=not-a-real-token&type=email");
    await expect(page).toHaveURL(/\/auth\/expired\?type=signup/);
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "This link has expired. We can send you a new one." }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Send a new link" })).toBeVisible();
  });
});
