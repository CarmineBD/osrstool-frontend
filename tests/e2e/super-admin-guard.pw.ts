import { expect, test } from "@playwright/test";

const SUPABASE_STORAGE_KEY = "sb-127-auth-token";

test("blocks non-super-admin users from edit route with 403 UI", async ({
  page,
}) => {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;

  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    },
    {
      storageKey: SUPABASE_STORAGE_KEY,
      session: {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: expiresAt,
        token_type: "bearer",
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
    }
  );

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

  await page.goto("/moneyMakingMethod/test-method/edit");

  await expect(page.getByText("HTTP 403")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "403 - Super admin only" })
  ).toBeVisible();
  await expect(
    page.getByText("This area is restricted to super_admin users.")
  ).toBeVisible();
  await expect(page).toHaveURL(/\/moneyMakingMethod\/test-method\/edit$/);
});
