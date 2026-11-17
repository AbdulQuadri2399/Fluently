import { expect, test } from "@playwright/test";
import { SEEDED, signIn } from "./helpers/auth";
import { shoot } from "./helpers/shoot";

test("FF9 invalid toolkit file: row-level errors, nothing saved (AC4.2, AC4.3)", async ({
  page,
}) => {
  await signIn(page, SEEDED.admin);
  await page.goto("/toolkit");
  const versionsBefore = await page
    .getByRole("row")
    .filter({ hasText: /^Version \d+/ })
    .count();

  await page.getByLabel("Upload toolkit").setInputFiles("fixtures/toolkit/bad-duplicate-id.csv");
  const alert = page.getByRole("alert").filter({ hasText: "Nothing has been saved" });
  await expect(alert).toContainText(
    'Rows 3, 6: the ID "P002" is used more than once. IDs must be unique.',
  );
  await expect(page.getByRole("button", { name: /^Save as version/ })).toHaveCount(0);
  await shoot(page, "SCR11-invalid");

  await page.getByLabel("Upload toolkit").setInputFiles("fixtures/toolkit/bad-missing-columns.csv");
  await expect(
    page.getByText("This file is missing required columns: Sub-Goal, Mechanism."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: /^Version \d+/ })).toHaveCount(
    versionsBefore,
  );
});
