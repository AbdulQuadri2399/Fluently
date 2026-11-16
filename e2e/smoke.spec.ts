import { expect, test } from "@playwright/test";

test("home page responds", async ({ request }) => {
  const res = await request.get("/projects", { maxRedirects: 0 });
  expect([200, 307]).toContain(res.status());
});
