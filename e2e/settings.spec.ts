import { expect, test } from "@playwright/test";
import { SEEDED, signIn } from "./helpers/auth";
import { shoot } from "./helpers/shoot";

test.describe("SCR12 settings (AC3.6)", () => {
  test("a member sees usage only, no admin controls", async ({ page }) => {
    await signIn(page, SEEDED.member);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Usage" })).toBeVisible();
    for (const name of ["Who can join", "Members", "AI models", "Budget"]) {
      await expect(page.getByRole("heading", { name })).toHaveCount(0);
    }
    await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
    await shoot(page, "SCR12-member");
  });

  test("an admin sees every section and can save a model choice", async ({ page }) => {
    await signIn(page, SEEDED.admin);
    await page.goto("/settings");
    for (const name of [
      "Who can join",
      "Members",
      "AI models",
      "Budget",
      "Agency services",
      "Sensitive sectors",
      "Usage",
    ]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
    await shoot(page, "SCR12-admin");
    const models = page.getByRole("region", { name: "AI models" });
    await models.getByRole("combobox", { name: "Effort: Research" }).selectOption("high");
    await models.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Effort: Research" })).toHaveValue("high");
    // Put it back so reruns start from the default.
    await page.getByRole("combobox", { name: "Effort: Research" }).selectOption("medium");
    await page
      .getByRole("region", { name: "AI models" })
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(page.getByText("Saved.")).toBeVisible();
  });
});
