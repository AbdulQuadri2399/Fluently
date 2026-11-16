import { expect, type Page } from "@playwright/test";

export const SEEDED = {
  admin: { email: "admin@fluently.test", password: "password-dev-123" },
  member: { email: "member@fluently.test", password: "password-dev-123" },
} as const;

export function uniqueEmail(domain = "fluently.test"): string {
  return `e2e${Date.now()}${Math.floor(Math.random() * 1e5)}@${domain}`;
}

export async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects/);
}
