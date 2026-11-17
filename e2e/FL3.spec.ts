import { expect, test } from "@playwright/test";
import { openReadyForResearch } from "./helpers/research";
import { shoot } from "./helpers/shoot";

test("FL3 research → choose opportunities → approve (fake AI) (AC11.1, AC12.5, AC14.1–AC14.3)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openReadyForResearch(page);
  await page.getByRole("button", { name: "Start research" }).click();
  await expect(
    page.getByText("Research is done. Choose which opportunities to take forward."),
  ).toBeVisible({ timeout: 30_000 });

  // The tree now has findings, themes, opportunities and a gap.
  await expect(
    page
      .locator(".react-flow__node")
      .filter({ hasText: "Show progress through verification" })
      .first(),
  ).toBeVisible();
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "Progress isn't visible" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".react-flow__node")
      .filter({ hasText: "Do people drop out because of privacy worries" }),
  ).toBeVisible();
  await shoot(page, "SCR8-research-checkpoint");

  // Nothing pre-selected; approve needs one.
  const approve = page.getByRole("button", { name: "Approve and generate solutions" });
  await expect(approve).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("checkbox", { name: /Show progress through verification/ }).click();
  await expect(approve).not.toHaveAttribute("aria-disabled", "true");
  await approve.click();
  await expect(
    page.getByText("Opportunities chosen. Solutions arrive in a later build step."),
  ).toBeVisible();

  // The opened Evidence card lists sources by kind.
  const card = page.locator(".react-flow__node").filter({ hasText: "Research sources" });
  await card.getByRole("button", { name: "Expand card" }).click();
  await expect(card.getByText("Academic papers")).toBeVisible();
  await expect(card.getByText("The goal-gradient hypothesis resurrected")).toBeVisible();
  await expect(card.getByText("Qualitative signal")).toBeVisible();
  await shoot(page, "SCR5-evidence-open");
});
