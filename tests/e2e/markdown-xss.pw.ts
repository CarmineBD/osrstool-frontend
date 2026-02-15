import { expect, test } from "@playwright/test";

test("sanitizes markdown payloads and blocks XSS vectors", async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __xssTriggered?: boolean }).__xssTriggered = false;
  });

  await page.route("**/api/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: "user-1",
          email: "user@example.com",
          role: "user",
        },
      }),
    });
  });

  await page.route("**/api/methods/slug/test-method**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          method: {
            id: "method-1",
            slug: "test-method",
            name: "XSS Method",
            description:
              'Safe [link](https://example.com)\n<script>window.__xssTriggered=true</script>\n<img src=x onerror="window.__xssTriggered=true">',
            category: "skilling",
            enabled: true,
            likes: 0,
            likedByMe: false,
            variants: [
              {
                slug: "main",
                label: "Main",
                description:
                  '[click me](javascript:window.__xssTriggered=true)<script>window.__xssTriggered=true</script>',
                requirements: {},
                inputs: [],
                outputs: [],
              },
            ],
          },
        },
      }),
    });
  });

  await page.goto("/moneyMakingMethod/test-method");

  await expect(page.getByRole("heading", { name: "XSS Method" })).toBeVisible();
  await expect(page.locator('script:has-text("__xssTriggered")')).toHaveCount(0);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page.locator("[onerror]")).toHaveCount(0);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(page.locator('a[href="https://example.com"]')).toBeVisible();
  await expect(page.getByText("click me")).toBeVisible();

  const xssTriggered = await page.evaluate(
    () => (window as Window & { __xssTriggered?: boolean }).__xssTriggered
  );
  expect(xssTriggered).toBe(false);
});
