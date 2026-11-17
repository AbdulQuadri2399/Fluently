import { expect, test } from "@playwright/test";
import { freshWorkspaceUser } from "./helpers/workspace";
import { openNewBrief } from "./helpers/brief";

test("FF3 wrong file type: only that file is rejected, named (AC8.7)", async ({ page }) => {
  await openNewBrief(page, await freshWorkspaceUser(), "optimise");
  await page.getByLabel("Add files: Current assets").setInputFiles([
    { name: "home.png", mimeType: "image/png", buffer: Buffer.from("png") },
    { name: "notes.docx", mimeType: "application/msword", buffer: Buffer.from("doc") },
  ]);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: '"notes.docx" can\'t be added. Use PNG, JPG or WebP up to 10 MB.' }),
  ).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: /^home\.png$/ })).toBeVisible();
});
