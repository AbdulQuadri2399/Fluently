import type { Page } from "@playwright/test";

// Desktop only (D23): designed at 1280, narrowest supported width 1024.
const WIDTHS = [1280, 1024] as const;
const THEMES = ["light", "dark"] as const;

/**
 * Saves e2e/screenshots/<name>-<theme>-<width>.png for each theme and width,
 * for comparison with the matching 03b §5 row. Restores the original viewport.
 */
export async function shoot(page: Page, name: string): Promise<string[]> {
  const original = page.viewportSize();
  const files: string[] = [];
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      const file = `e2e/screenshots/${name}-${theme}-${width}.png`;
      await page.screenshot({ path: file, fullPage: true });
      files.push(file);
    }
  }
  if (original) await page.setViewportSize(original);
  await page.emulateMedia({ colorScheme: null });
  return files;
}
