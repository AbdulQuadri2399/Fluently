import { expect, test } from "@playwright/test";
import { addPastedEmail, openNewBrief } from "./helpers/brief";
import { shoot } from "./helpers/shoot";
import { freshWorkspaceUser, serviceClient } from "./helpers/workspace";

test("Emails only: Screens is coming soon; add emails on the brief and the canvas (AC31.1, AC31.2, AC32.6)", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const who = await freshWorkspaceUser();
  await openNewBrief(page, who, "new", false);
  await expect(page.getByRole("heading", { name: "Emails" })).toBeVisible();

  // Approval needs an email.
  await page.getByLabel("Business objective").fill("Raise ID checks by 15% in 3 months");
  await page.getByLabel("Behavioural objective").fill("New customers upload their ID on day one");
  await page.getByLabel("Sector").selectOption("Banking");
  await expect(page.getByText("Add at least one email to audit.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve objectives" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  // Competitors are optional and saved; more than five is flagged.
  await page.getByLabel("Competitors (optional)").fill("Alpha Bank\nBeta Bank");
  await expect(page.getByText("Saved")).toBeVisible();
  await page.getByLabel("Competitors (optional)").fill("A\nB\nC\nD\nE\nF");
  await expect(page.getByText("Add up to five competitors, one per line.")).toBeVisible();
  await page.getByLabel("Competitors (optional)").fill("Alpha Bank\nBeta Bank");

  await addPastedEmail(page, "Welcome to Examplebank");
  await shoot(page, "SCR6-emails");
  await expect(page.getByRole("button", { name: "Approve objectives" })).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.getByRole("button", { name: "Approve objectives" }).click();
  await expect(page.getByRole("link", { name: "Go to canvas" })).toBeVisible();
  await page.getByRole("link", { name: "Go to canvas" }).click();

  // The canvas shows the email as a card under the objectives, with its parts in the details.
  const card = page.locator(".react-flow__node").filter({ hasText: "Welcome to Examplebank" });
  await expect(card).toBeVisible();
  await expect(card.getByText("1 button · no preheader")).toBeVisible();
  await card.click();
  const panel = page.getByRole("complementary", { name: "Email" });
  await expect(panel.getByRole("region", { name: "Email parts" })).toContainText(
    "Verify my identity",
  );
  await expect(panel.getByRole("button", { name: "Edit" })).toHaveCount(0);

  // Add a second email from the Objectives lane, as a file this time (an .eml).
  await page.getByRole("button", { name: "Add a card to Objectives" }).click();
  const dialog = page.getByRole("dialog", { name: "Add an email" });
  await dialog.getByRole("button", { name: "Upload a file" }).click();
  await dialog.getByLabel("HTML or EML file").setInputFiles({
    name: "sale.eml",
    mimeType: "message/rfc822",
    buffer: Buffer.from(
      'Subject: Twenty percent off\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<h2>20% off</h2><p><a href="https://example.org/shop">Shop the sale</a></p>',
    ),
  });
  await dialog.getByRole("button", { name: "Add email" }).click();
  await expect(page.getByText("Email added.")).toBeVisible();
  await page.getByRole("button", { name: "Fit to screen" }).click();
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "Twenty percent off" }),
  ).toBeVisible();

  // Remove it again.
  await page.locator(".react-flow__node").filter({ hasText: "Twenty percent off" }).click();
  const second = page.getByRole("complementary", { name: "Email" });
  await second.getByRole("button", { name: "Remove", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Remove this email?" })
    .getByRole("button", { name: "Remove email" })
    .click();
  await expect(page.getByText("Email removed.")).toBeVisible();
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "Twenty percent off" }),
  ).toHaveCount(0);

  const { data } = await serviceClient().from("emails").select("subject").order("created_at");
  expect((data ?? []).map((e) => e.subject)).toContain("Welcome to Examplebank");
  expect((data ?? []).map((e) => e.subject)).not.toContain("Twenty percent off");
});

test("New project: Screens is coming soon and can't be chosen (AC31.1)", async ({ page }) => {
  const who = await freshWorkspaceUser();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "New project" }).click();
  await expect(page.getByRole("radio", { name: /Screens and flows\. Coming soon/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: "Email", exact: true })).toBeChecked();
});
