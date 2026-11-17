import { expect, test } from "@playwright/test";
import { SEEDED, signIn } from "./helpers/auth";
import { shoot } from "./helpers/shoot";
import { existsSync } from "node:fs";

test("sign-in page responds", async ({ request }) => {
  const res = await request.get("/sign-in");
  expect(res.status()).toBe(200);
});

test("signed-in user sees the sidebar and can sign out", async ({ page }) => {
  await signIn(page, SEEDED.member);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Projects" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Toolkit" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fprojects/);
});

test("SCR1 default screenshots in light and dark", async ({ page }) => {
  await page.goto("/sign-in");
  const files = await shoot(page, "SCR1-default");
  for (const f of files) expect(existsSync(f)).toBe(true);
});
