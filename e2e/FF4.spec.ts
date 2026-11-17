import { expect, test } from "@playwright/test";
import { freshWorkspaceUser } from "./helpers/workspace";
import { openNewBrief } from "./helpers/brief";
import { shoot } from "./helpers/shoot";

test("FF4 flag → override → research enabled (AC10.3, AC26.1, AC26.2)", async ({ page }) => {
  await openNewBrief(page, await freshWorkspaceUser());
  await page.getByLabel("Business objective").fill("Raise upgrades by 10% this quarter");
  await page
    .getByLabel("Behavioural objective")
    .fill("Trial users upgrade before their trial ends");
  await page.getByLabel("Audience and context").fill("Show a countdown so they hurry to upgrade");
  await page.getByLabel("Sector").selectOption("Telecoms");
  await page.getByRole("button", { name: "Approve objectives" }).click();

  await expect(
    page.getByRole("heading", { name: "The ethics check flagged this brief" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Fake urgency or scarcity.")).toBeVisible();
  await shoot(page, "SCR6-flagged");

  await page.getByRole("button", { name: "Override with a reason" }).click();
  await page
    .getByLabel("Your reason")
    .fill("The trial really does end; the timer shows the true date.");
  await page.getByRole("button", { name: "Record override" }).click();
  await expect(page.getByText(/^Overridden by [A-Z]{1,2}$/)).toBeVisible();
  await expect(page.getByText(/Objectives approved and the ethics check passed/)).toBeVisible();
});
