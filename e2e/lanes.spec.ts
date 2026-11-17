import { expect, test, type Page } from "@playwright/test";
import { ready } from "./helpers/ready";
import { freshWorkspaceUser, seedApprovedProject } from "./helpers/workspace";

async function open(page: Page) {
  const who = await freshWorkspaceUser();
  const projectId = await seedApprovedProject(who.email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByText("Upload ID on day one")).toBeVisible();
}

const box = async (page: Page, text: string) => (await page.getByText(text).boundingBox())!;

test.describe("Lanes (AC22.8, D24)", () => {
  // The synthetic mouse drag is occasionally dropped by the canvas under heavy test load
  // (about 1 run in 7); real drags have not shown this. Retried rather than hidden.
  test.describe.configure({ retries: 2 });
  test("card can move up/down but not into another lane; order persists after reload", async ({
    page,
  }) => {
    await open(page);
    const first = await box(page, "Raise ID checks by 15%");
    const second = await box(page, "Upload ID on day one");
    expect(first.y).toBeLessThan(second.y);

    // Drag the first card down and to the right, past the second card.
    await ready(page);
    await expect(page.locator(".react-flow__node.draggable")).toHaveCount(3);
    const from = await box(page, "Raise ID checks by 15%");
    const to = await box(page, "Upload ID on day one");
    await page.mouse.move(from.x + 20, from.y + 10);
    await page.mouse.down();
    await page.mouse.move(from.x + 120, from.y + 40, { steps: 10 });
    await page.mouse.move(from.x + 420, to.y + 60, { steps: 20 });
    await page.mouse.up();
    await expect
      .poll(
        async () =>
          (await box(page, "Raise ID checks by 15%")).y -
          (await box(page, "Upload ID on day one")).y,
      )
      .toBeGreaterThan(0);
    const moved = await box(page, "Raise ID checks by 15%");
    expect(Math.abs(moved.x - first.x)).toBeLessThan(2);

    await page.reload();
    await expect(page.getByText("Upload ID on day one")).toBeVisible();
    expect((await box(page, "Raise ID checks by 15%")).y).toBeGreaterThan(
      (await box(page, "Upload ID on day one")).y,
    );
  });
});
