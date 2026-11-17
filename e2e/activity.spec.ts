import { expect, test } from "@playwright/test";
import { openReadyForResearch } from "./helpers/research";
import { shoot } from "./helpers/shoot";

test("See what it's doing: research questions and a live activity log (AC11.9, AC11.10)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openReadyForResearch(page);
  await page.getByRole("button", { name: "Start research" }).click();
  await page.getByRole("button", { name: "See what it's doing" }).click();
  const panel = page.getByRole("dialog", { name: "What Fluently is doing" });
  await expect(panel.getByRole("heading", { name: "Research questions" })).toBeVisible();
  await expect(panel.getByRole("listitem").filter({ hasText: /\?$/ }).first()).toBeVisible();
  await expect(panel.getByText("Wrote 4 research questions")).toBeVisible();
  await expect(panel.getByText("Academic papers started")).toBeVisible({ timeout: 30_000 });
  await shoot(page, "SCR8-activity");
  // Live: later steps arrive without reopening the panel.
  await expect(panel.getByText("Themes and opportunities done")).toBeVisible({ timeout: 45_000 });
});
