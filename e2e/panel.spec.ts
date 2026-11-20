import { expect, test } from "@playwright/test";
import { openReadyForResearch } from "./helpers/research";

// The minimised decision panel keeps its main button inside the panel, whatever the message length.
for (const width of [1024, 1280, 2000]) {
  test(`minimised panel: Start research stays inside it at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openReadyForResearch(page);
    await page.getByRole("button", { name: "Minimise" }).click();
    const panel = page.getByRole("region", { name: "Decision panel" });
    const start = panel.getByRole("button", { name: "Start research" });
    await expect(start).toBeVisible();
    const p = (await panel.boundingBox())!;
    const b = (await start.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(p.x);
    expect(b.x + b.width).toBeLessThanOrEqual(p.x + p.width + 1);
    expect(b.x + b.width).toBeLessThanOrEqual(width);
  });
}
