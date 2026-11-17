import { expect, test } from "@playwright/test";
import { freshWorkspaceUser } from "./helpers/workspace";
import { openNewBrief } from "./helpers/brief";

test("FF2 suggestion unavailable: text kept, can carry on (AC8.4)", async ({ page }) => {
  await openNewBrief(page, await freshWorkspaceUser());
  const field = page.getByLabel("Constraints (optional)");
  await field.fill("Must follow brand rules #unavailable");
  await field.blur();
  await expect(
    page.getByText(
      "Suggestions aren't available right now. Your text is saved, and you can carry on.",
    ),
  ).toBeVisible();
  await expect(field).toHaveValue("Must follow brand rules #unavailable");
  await expect(page.getByText("Saved just now")).toBeVisible();
});
