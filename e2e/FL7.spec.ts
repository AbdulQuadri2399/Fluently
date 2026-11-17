import { expect, test } from "@playwright/test";
import { SEEDED, signIn } from "./helpers/auth";
import { ready } from "./helpers/ready";
import { shoot } from "./helpers/shoot";

test("FL7 admin uploads the toolkit: check, preview, save as the new default (AC4.1, AC4.5)", async ({
  page,
}) => {
  await signIn(page, SEEDED.admin);
  await page.goto("/toolkit");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Toolkit", level: 1 })).toBeVisible();
  await page.getByLabel("Upload toolkit").setInputFiles("fixtures/toolkit/sample-toolkit.csv");

  const preview = page.getByRole("region", { name: "Checking sample-toolkit.csv" });
  await expect(preview.getByText("30 rows · 30 principles")).toBeVisible();
  await expect(preview.getByText(/isn't in this file, so no connection was made/)).toBeVisible();
  await shoot(page, "SCR11-preview");

  const saveButton = preview.getByRole("button", { name: /^Save as version \d+$/ });
  const label = (await saveButton.textContent()) ?? "";
  const n = Number(label.match(/\d+/)?.[0]);
  await saveButton.click();
  await expect(
    page.getByText(`Toolkit version ${n} saved. New projects will use it.`),
  ).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: `Version ${n}` });
  await expect(row.getByText("Default")).toBeVisible();
  await expect(row.getByText("30", { exact: true })).toBeVisible();
  await shoot(page, "SCR11-default");
});
