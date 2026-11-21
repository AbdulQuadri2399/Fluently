import { expect, test } from "@playwright/test";
import { openNewBrief } from "./helpers/brief";
import { shoot } from "./helpers/shoot";
import { freshWorkspaceUser } from "./helpers/workspace";

const HTML =
  '<div style="display:none;max-height:0;overflow:hidden;">Two quick steps left.</div>' +
  '<table width="600" style="width:600px"><tr><td><h1>Welcome to Examplebank</h1><p>Thanks for joining.</p></td></tr>' +
  '<tr><td bgcolor="#1a5fb4" style="background-color:#1a5fb4;padding:12px"><a href="https://example.org/verify" style="color:#ffffff">Verify my identity</a></td></tr></table>';

test("Phone view: render an email, see the picture and what was measured, switch images", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openNewBrief(page, await freshWorkspaceUser(), "new", false);
  await page.getByLabel("Business objective").fill("Raise ID checks by 15% in 3 months");
  await page.getByLabel("Behavioural objective").fill("New customers upload their ID on day one");
  await page.getByLabel("Sector").selectOption("Banking");
  await page.getByRole("button", { name: "Add email" }).click();
  const add = page.getByRole("dialog", { name: "Add an email" });
  await add.getByLabel("Subject line").fill("Welcome to Examplebank");
  await add.getByLabel("Email HTML").fill(HTML);
  await add.getByRole("button", { name: "Add email" }).click();

  await expect(page.getByRole("button", { name: "Approve objectives" })).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.getByRole("button", { name: "Approve objectives" }).click();
  await page.getByRole("link", { name: "Go to canvas" }).click();

  // The card says an email is attached and that its preview is in the side panel; clicking opens it.
  const card = page.locator(".react-flow__node").filter({ hasText: "Welcome to Examplebank" });
  const strip = card.getByTestId("attachment-strip");
  await expect(strip).toContainText("Email attached");
  await expect(strip).toContainText("Phone preview and details in the side panel");
  await shoot(page, "SCR5-email-attached");
  await strip.click();
  await expect(strip).toContainText("Showing in the side panel");
  const panel = page.getByRole("region", { name: "Phone view" });

  // One phone, showing the live email, ready before anything is rendered.
  await expect(panel.getByTestId("phone-frame")).toBeVisible();
  await expect(page.getByTestId("phone-frame")).toHaveCount(1);
  const email = page.frameLocator("iframe[title^='Preview of']");
  await expect(email.getByText("Welcome to Examplebank")).toBeVisible();
  await expect(email.locator("[data-fold]")).toBeAttached();
  await expect(panel.getByText(/Not rendered yet/)).toBeVisible();

  // Render for the audit: the measured facts appear.
  await panel.getByRole("button", { name: "Render for the audit" }).click();
  await expect(panel.getByText(/Rendered for the audit/)).toBeVisible({ timeout: 60_000 });
  await expect(panel.getByText(/Preheader: \d+ characters/)).toBeVisible();
  await expect(panel.getByText(/Wider than a phone|Fits a phone/)).toBeVisible();
  await expect(panel.getByText("Verify my identity")).toBeVisible();
  await shoot(page, "SCR5-phone-view");

  // The other images setting has its own render, so it starts unrendered; the phone stays one.
  await panel.getByLabel(/Load this email's images/).check();
  await expect(panel.getByText(/Not rendered yet/)).toBeVisible();
  await expect(page.getByTestId("phone-frame")).toHaveCount(1);
  await panel.getByLabel(/Load this email's images/).uncheck();
  await expect(panel.getByText(/Rendered for the audit/)).toBeVisible();
});
