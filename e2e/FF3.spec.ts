import { expect, test } from "@playwright/test";
import { freshWorkspaceUser } from "./helpers/workspace";
import { openNewBrief } from "./helpers/brief";

test("FF3 wrong file type: only that file is rejected, named (AC8.7)", async ({ page }) => {
  await openNewBrief(page, await freshWorkspaceUser(), "optimise");
  await page.getByLabel("Add files: Client data (optional)").setInputFiles([
    { name: "reviews.csv", mimeType: "text/csv", buffer: Buffer.from("a,b\n1,2") },
    { name: "notes.docx", mimeType: "application/msword", buffer: Buffer.from("doc") },
  ]);
  await expect(
    page.getByRole("alert").filter({
      hasText: '"notes.docx" can\'t be added. Use CSV, TXT, PDF or XLSX up to 20 MB.',
    }),
  ).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: /^reviews\.csv$/ })).toBeVisible();
});
