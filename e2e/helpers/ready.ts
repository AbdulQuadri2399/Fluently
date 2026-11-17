import type { Page } from "@playwright/test";

/**
 * Waits until the page is interactive: the app frame has started up and the page's own code has
 * finished downloading (page code can arrive after the frame, so events before it are lost).
 */
export async function ready(page: Page) {
  await page.locator('body[data-hydrated="true"]').waitFor();
  await page.waitForLoadState("networkidle");
}
