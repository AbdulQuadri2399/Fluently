import { expect, test } from "@playwright/test";
import { openReadyForResearch } from "./helpers/research";

test("FF5 a research step fails: others continue, Retry failed steps offered (AC11.4, AC11.5)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openReadyForResearch(page, "Brief that makes papers fail #fail-papers");
  await page.getByRole("button", { name: "Start research" }).click();
  await expect(
    page.getByText("Research is done. Choose which opportunities to take forward."),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Research finished, but Academic papers didn't work/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry failed steps" })).toBeVisible();
});
