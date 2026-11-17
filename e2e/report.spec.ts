import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ready } from "./helpers/ready";
import { openReadyForResearch } from "./helpers/research";
import { shoot } from "./helpers/shoot";

test("Audit Report: sections, citations, citation check and download (AC15.1–AC15.4, AC12.8, AC13.5)", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const projectId = await openReadyForResearch(page);
  await page.getByRole("link", { name: "Report" }).click();
  await expect(page.getByText("The Audit Report appears once research finishes.")).toBeVisible();

  await page.goto(`/projects/${projectId}`);
  await ready(page);
  await page.getByRole("button", { name: "Start research" }).click();
  await expect(
    page.getByText("Research is done. Choose which opportunities to take forward."),
  ).toBeVisible({ timeout: 60_000 });

  await page.goto(`/projects/${projectId}/report`);
  await ready(page);
  await expect(page.getByRole("heading", { name: "Audit Report", level: 1 })).toBeVisible();
  for (const h of ["Summary", "Themes", "Opportunities", "Evidence gaps", "References"])
    await expect(page.getByRole("heading", { name: h, level: 2 })).toBeVisible();
  await expect(page.getByText(/open questions?: \d+ for discovery research/)).toBeVisible();
  await expect(page.getByText(/(High|Med|Low) strength/).first()).toBeVisible();
  await page.getByRole("link", { name: "Source 1" }).first().click();
  await expect(page).toHaveURL(/#ref-1$/);
  await shoot(page, "SCR9-report");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  await page.getByRole("menuitem", { name: "Markdown (.md)" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^audit-report-.+\.md$/);
  const md = readFileSync((await file.path())!, "utf8");
  expect(md).toContain("## References");

  await page.getByRole("link", { name: "Citation check" }).click();
  await expect(page.getByRole("heading", { name: "Citation check" })).toBeVisible();
  expect(await page.getByRole("row").count()).toBeGreaterThan(3);
  await shoot(page, "SCR9-citations");
});
