import { expect, test, type Page } from "@playwright/test";
import { openReadyForResearch } from "./helpers/research";
import { shoot } from "./helpers/shoot";

const card = (page: Page, text: string) =>
  page.locator(".react-flow__node").filter({ hasText: text });

test("Slice 8: trace, add, connect, delete with undo, merge, regenerate stale (AC23.x, AC24.x, AC30.x)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openReadyForResearch(page);
  await page.getByRole("button", { name: "Start research" }).click();
  await expect(
    page.getByText("Research is done. Choose which opportunities to take forward."),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Minimise" }).click();

  // Trace: cards off the path fade; Esc clears.
  await card(page, "Make the ID step feel shorter").click();
  const panel = page.getByRole("complementary", { name: "Opportunity" });
  await panel.getByRole("button", { name: "Trace" }).click();
  await expect(panel.getByRole("region", { name: "Path back to the evidence" })).toBeVisible();
  await expect(
    panel.getByRole("listitem").filter({ hasText: "Objective ·" }).first(),
  ).toBeVisible();
  await expect(page.locator('[data-testid^="card-"].opacity-35').first()).toBeVisible();
  await shoot(page, "SCR5-trace");
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-testid^="card-"].opacity-35')).toHaveCount(0);

  // Add a theme by hand, built from a finding.
  await page.getByRole("button", { name: "Add a card to Themes" }).click();
  const add = page.getByRole("dialog", { name: "Add a theme" });
  await add.getByLabel("Title").fill("People fear failing the photo check");
  await add.getByRole("checkbox", { name: /Every extra step/ }).click();
  await add.getByRole("button", { name: "Add card" }).click();
  await expect(card(page, "People fear failing the photo check")).toBeVisible();
  await expect(page.getByText("Theme added.")).toBeVisible();
  await page.getByRole("button", { name: "Fit to screen" }).click();

  // Connect it to an opportunity from the details panel; the opportunity goes out of date.
  await card(page, "People fear failing the photo check").click();
  const themePanel = page.getByRole("complementary", { name: "Theme" });
  await themePanel
    .getByLabel("Add a connection")
    .selectOption({ label: "Make the ID step feel shorter" });
  await themePanel.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText("Connected.")).toBeVisible();
  await expect(card(page, "Make the ID step feel shorter").getByText("Out of date")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Update out-of-date cards \(\d+\)$/ }),
  ).toBeVisible();

  // Removing the only link a theme has is refused.
  await themePanel.getByRole("button", { name: /^Remove connection: Every extra step/ }).click();
  await expect(
    page.getByText(
      "This theme needs at least one finding. Connect another before removing this one.",
    ),
  ).toBeVisible();

  // Delete with a confirm, then Undo.
  await themePanel.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this theme?" });
  await expect(dialog.getByText(/1 item built from it will be marked out of date\./)).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Theme deleted.")).toBeVisible();
  await expect(card(page, "People fear failing the photo check")).toHaveCount(0);
  await page
    .locator("[data-sonner-toast]")
    .filter({ hasText: "Theme deleted." })
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(card(page, "People fear failing the photo check")).toBeVisible();

  // Objectives can't be deleted.
  await card(page, "Raise ID checks by 15%").click();
  await expect(
    page
      .getByRole("complementary", { name: "Objective" })
      .getByText("Objectives can't be deleted. Change them in the brief instead."),
  ).toBeVisible();

  // Merge two themes: Shift-click, then Merge.
  await card(page, "The ID step takes too much effort").click();
  await card(page, "Progress isn't visible").click({ modifiers: ["Shift"] });
  await expect(page.getByText("2 cards selected")).toBeVisible();
  await page.getByRole("button", { name: "Merge", exact: true }).click();
  const merge = page.getByRole("dialog", { name: "Merge cards" });
  await merge.getByLabel("Title of the merged card").fill("Effort and progress");
  await merge.getByRole("button", { name: "Merge", exact: true }).click();
  await expect(page.getByText("Cards merged.")).toBeVisible();
  await expect(card(page, "Effort and progress")).toBeVisible();
  await expect(card(page, "Progress isn't visible")).toHaveCount(0);
});
