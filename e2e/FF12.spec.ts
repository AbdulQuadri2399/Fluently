import { expect, test } from "@playwright/test";
import { ready } from "./helpers/ready";
import { openReadyForResearch } from "./helpers/research";
import { serviceClient } from "./helpers/workspace";

test("FF12 stage pauses at cap; member confirms; run continues (AC27.3, AC27.4)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const projectId = await openReadyForResearch(page);
  const db = serviceClient();
  const { data: p } = await db.from("projects").select("workspace_id").eq("id", projectId).single();
  // $13 at 0.79 GBP/USD is just over the default £10 budget.
  await db.from("ai_usage").insert({
    workspace_id: p!.workspace_id,
    project_id: projectId,
    stage: "ethics",
    step: "ethics",
    model: "claude-haiku-5-5",
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 13,
    duration_ms: 1,
    success: true,
  });
  await page.reload();
  await ready(page);
  await expect(
    page.getByText(/This project has used £10\.\d\d of its £10\.00 AI budget\./),
  ).toBeVisible();

  await page.getByRole("button", { name: "Start research" }).click();
  await expect(
    page.getByText(
      "This project has reached its £10.00 AI budget. Continue anyway, or ask an admin to raise it.",
    ),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Raise budget" })).toBeVisible();
  await page.getByRole("button", { name: "Continue anyway" }).click();
  await expect(
    page.getByText("Research is done. Choose which opportunities to take forward."),
  ).toBeVisible({ timeout: 60_000 });
});
