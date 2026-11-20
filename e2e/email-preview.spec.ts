import { expect, test } from "@playwright/test";
import { openNewBrief } from "./helpers/brief";
import { shoot } from "./helpers/shoot";
import { freshWorkspaceUser } from "./helpers/workspace";

const HTML =
  '<div style="display:none;max-height:0;overflow:hidden;">Your made-up account is ready.</div>' +
  "<h1>Welcome to Examplebank</h1><p>Thanks for joining.</p>" +
  '<table><tr><td bgcolor="#1a5fb4" style="background-color:#1a5fb4;padding:12px"><a href="https://example.org/verify">Verify my identity</a></td></tr></table>' +
  '<div style="height:900px"></div>' +
  '<p><a href="https://example.org/later">remind me later</a></p>' +
  '<img src="https://tracker.invalid/pixel.gif" width="1" height="1" alt="">';

test("Email preview: safe by default, shows preheader and buttons, on the brief and the canvas card", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // Counts only requests that really reach the network; ones the page blocks itself never do.
  const reached: string[] = [];
  await page.route("**/tracker.invalid/**", async (route) => {
    reached.push(route.request().url());
    await route.fulfill({ status: 200, contentType: "image/gif", body: "" });
  });

  await openNewBrief(page, await freshWorkspaceUser(), "new", false);
  await page.getByRole("button", { name: "Add email" }).click();
  const add = page.getByRole("dialog", { name: "Add an email" });
  await add.getByLabel("Subject line").fill("Welcome to Examplebank");
  await add.getByLabel("Email HTML").fill(HTML);
  await add.getByRole("button", { name: "Add email" }).click();

  // Preview straight from the brief.
  await page.getByRole("button", { name: "Preview: Welcome to Examplebank" }).click();
  const dialog = page.getByRole("dialog", { name: "Email preview" });
  await expect(dialog.getByText("Your made-up account is ready.")).toBeVisible();
  await expect(
    dialog.getByRole("listitem").filter({ hasText: "Verify my identity" }),
  ).toBeVisible();
  const iframe = dialog.locator("iframe");
  await expect(iframe).toHaveAttribute("sandbox", "allow-same-origin");

  // Which link is a button, which is plain, and which sits above the fold (measured in the browser).
  const buttonRow = dialog.getByRole("listitem").filter({ hasText: "Verify my identity" });
  await expect(buttonRow).toContainText("Button");
  await expect(buttonRow).toContainText("main");
  await expect(buttonRow).toContainText("Above the fold");
  const linkRow = dialog.getByRole("listitem").filter({ hasText: "remind me later" });
  await expect(linkRow).toContainText("Link");
  await expect(linkRow).not.toContainText("Button");
  await expect(linkRow).toContainText("Below the fold");
  await expect(dialog.getByTestId("fold-line")).toBeVisible();
  await expect(
    page.frameLocator("iframe[title^='Preview of']").getByText("Welcome to Examplebank"),
  ).toBeVisible();
  await shoot(page, "SCR6-email-preview");

  // Nothing is fetched from the email's own addresses while images are off ...
  await page.waitForTimeout(500);
  expect(reached).toEqual([]);
  // ... and only after the person asks for images.
  await dialog.getByLabel(/Load this email's images/).check();
  await expect.poll(() => reached.length).toBeGreaterThan(0);
  await page.keyboard.press("Escape");

  // Approve the brief, then expand the email card on the canvas.
  await page.getByLabel("Business objective").fill("Raise ID checks by 15% in 3 months");
  await page.getByLabel("Behavioural objective").fill("New customers upload their ID on day one");
  await page.getByLabel("Sector").selectOption("Banking");
  await page.getByRole("button", { name: "Approve objectives" }).click();
  await page.getByRole("link", { name: "Go to canvas" }).click();
  const card = page.locator(".react-flow__node").filter({ hasText: "Welcome to Examplebank" });
  await card.getByRole("button", { name: "Expand card" }).click();
  await expect(card.getByText("Your made-up account is ready.")).toBeVisible();
  await expect(card.getByText("Verify my identity")).toBeVisible();
  await expect(card.locator("iframe")).toHaveAttribute("sandbox", "allow-same-origin");
  await shoot(page, "SCR5-email-card");
  await card.getByRole("button", { name: "Collapse card" }).click();
  await expect(card.locator("iframe")).toHaveCount(0);
});
