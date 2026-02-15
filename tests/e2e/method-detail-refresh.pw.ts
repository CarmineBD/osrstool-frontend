import { expect, test } from "@playwright/test";

test("refreshes method detail data on interval", async ({ page }) => {
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

  let firstResponse = true;
  await page.route("**/api/methods/slug/test-method**", async (route) => {
    const variantLabel = firstResponse ? "v1" : "v2";
    firstResponse = false;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          method: {
            id: "method-1",
            slug: "test-method",
            name: `Refresh method ${variantLabel}`,
            description: "Method description",
            category: "skilling",
            enabled: true,
            likes: 0,
            likedByMe: false,
            variants: [
              {
                slug: "main",
                label: "Main",
                description: `Variant ${variantLabel}`,
                highProfit: variantLabel === "v1" ? 1000 : 2000,
                lowProfit: variantLabel === "v1" ? 900 : 1900,
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

  await expect(
    page.getByRole("heading", { name: "Refresh method v1" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Refresh method v2" })
  ).toBeVisible({ timeout: 10_000 });
});
