import { expect, test } from "@playwright/test";
import { openNewBrief } from "./helpers/brief";
import { ready } from "./helpers/ready";
import { shoot } from "./helpers/shoot";
import { freshWorkspaceAdmin } from "./helpers/workspace";

test("SCR5 tree: brief → ethics → canvas → research runs live → list view and details", async ({
  page,
}) => {
  test.setTimeout(90_000); // includes a full made-up research run
  const who = await freshWorkspaceAdmin();
  await openNewBrief(page, who);
  await page
    .getByLabel("Business objective")
    .fill("Raise completed ID checks by 15% within 3 months");
  await page
    .getByLabel("Behavioural objective")
    .fill("New customers upload their ID within their first day");
  await page.getByLabel("Sector").selectOption("Banking");
  await page.getByRole("button", { name: "Approve objectives" }).click();
  await expect(page.getByText("Ethics check passed", { exact: true })).toBeVisible({
    timeout: 15000,
  });

  // Toolkit needed before research (AC4.9): upload the invented one.
  const canvasUrl = page.url().replace(/\/brief$/, "");
  await page.goto("/toolkit");
  await ready(page);
  await page.getByLabel("Upload toolkit").setInputFiles("fixtures/toolkit/sample-toolkit.csv");
  await page.getByRole("button", { name: /^Save as version \d+$/ }).click();
  await expect(page.getByText(/Toolkit version \d+ saved/)).toBeVisible();
  await page.goto(canvasUrl);
  const strip = page.getByTestId("lane-strip");
  for (const lane of [
    "Objectives",
    "Evidence",
    "Themes",
    "Opportunities",
    "Solutions",
    "Wireframes",
    "Tests",
  ]) {
    await expect(strip.getByText(lane)).toBeVisible();
  }
  await expect(
    page.getByText("New customers upload their ID within their first day").first(),
  ).toBeVisible();
  await expect(page.getByText("Ethics check", { exact: true }).first()).toBeVisible();
  await shoot(page, "SCR5-default");

  // Start research; steps tick live and Evidence cards arrive without a reload (AC11.2).
  await page.getByRole("button", { name: "Start research" }).click();
  await expect(page.getByText(/Research is running/)).toBeVisible({ timeout: 10000 });
  // MI15: lines into the card research is working on flow while it runs, then stop.
  await expect(page.locator("path.dash-flow")).toHaveCount(2, { timeout: 10000 });
  await shoot(page, "SCR8-running");
  await expect(page.getByText("Research sources")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Research finished/)).toBeVisible({ timeout: 20000 });
  await expect(page.locator("path.dash-flow")).toHaveCount(0);

  // Details panel via click; list view toggle.
  await expect(page.getByText("47 sources across 5 kinds")).toBeVisible();
  await page.getByText("Research sources").click();
  const details = page.getByRole("complementary", { name: "Source" });
  await expect(details).toBeVisible();
  await expect(details.getByText("Academic papers")).toBeVisible();
  await expect(page).toHaveURL(/node=/);
  await shoot(page, "SCR7-default");
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.getByRole("heading", { name: "Evidence" })).toBeVisible();
});
