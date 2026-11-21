import { expect, test } from "@playwright/test";
import { addPastedEmail } from "./helpers/brief";
import { ready } from "./helpers/ready";
import { shoot } from "./helpers/shoot";
import { freshWorkspaceAdmin } from "./helpers/workspace";

test("Quick audit: run it on an email, read the findings, then add measured facts after a render", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const who = await freshWorkspaceAdmin();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The audit needs the toolkit.
  await page.goto("/toolkit");
  await ready(page);
  await page.getByLabel("Upload toolkit").setInputFiles("fixtures/toolkit/sample-toolkit.csv");
  await page.getByRole("button", { name: /^Save as version \d+$/ }).click();
  await expect(page.getByText(/Toolkit version \d+ saved/)).toBeVisible();

  // A project with one email, approved, and on its canvas.
  await page.goto("/home");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Audit e2e");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/brief$/);
  await page.getByLabel("Business objective").fill("Raise ID checks by 15% in 3 months");
  await page.getByLabel("Behavioural objective").fill("New customers upload their ID on day one");
  await page.getByLabel("Sector").selectOption("Banking");
  await addPastedEmail(page);
  await expect(page.getByRole("button", { name: "Approve objectives" })).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.getByRole("button", { name: "Approve objectives" }).click();
  await page.getByRole("link", { name: "Go to canvas" }).click();

  await page
    .locator(".react-flow__node")
    .filter({ hasText: "Welcome to Examplebank" })
    .getByTestId("attachment-strip")
    .click();
  const audit = page.getByRole("region", { name: "Quick audit" });
  await expect(audit.getByText("Not audited yet.")).toBeVisible();

  // Run it: findings by part, each with its proof; the principles used are listed.
  await audit.getByRole("button", { name: "Run quick audit" }).click();
  await expect(audit.getByText(/\d+ friction points?, \d+ working well/)).toBeVisible({
    timeout: 60_000,
  });
  await expect(audit.getByRole("region", { name: "Subject line" })).toBeVisible();
  await expect(audit.getByText("“Welcome to Examplebank”")).toBeVisible();
  await expect(audit.getByText("Audited against 20 toolkit principles")).toBeVisible();
  await expect(audit.getByText(/No phone picture was used/)).toBeVisible();
  await shoot(page, "SCR15-quick-audit");

  // Render for the audit, run again: measured facts now appear under "Not in the toolkit".
  const phone = page.getByRole("region", { name: "Phone view" });
  await phone.getByRole("button", { name: "Render for the audit" }).click();
  await expect(phone.getByText(/Rendered for the audit/)).toBeVisible({ timeout: 60_000 });
  await audit.getByRole("button", { name: "Run again" }).click();
  const outside = audit.getByRole("region", { name: "Not in the toolkit" });
  await expect(outside).toBeVisible({ timeout: 60_000 });
  await expect(outside.getByText(/Measured:/).first()).toBeVisible();
  await expect(audit.getByText(/No phone picture was used/)).toHaveCount(0);
});
