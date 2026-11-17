import { expect, test } from "@playwright/test";
import { SEEDED, signIn } from "./helpers/auth";
import { shoot } from "./helpers/shoot";

const notice =
  "Fluently works on laptop and desktop screens. Open it on a computer, or make this window wider.";

test.describe("Desktop only (AC22.6, D23)", () => {
  test("at 1000 px /projects shows app.desktopOnly", async ({ page }) => {
    await signIn(page, SEEDED.member);
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto("/projects");
    await expect(page.getByText(notice)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeHidden();
    await shoot(page, "SCR3-desktopOnly", { widths: [1000] });
  });

  test("at 1024 px /projects shows the page", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await signIn(page, SEEDED.member);
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.getByText(notice)).toBeHidden();
  });

  test("at 390 px /sign-in shows the form", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText(notice)).toHaveCount(0);
  });
});
