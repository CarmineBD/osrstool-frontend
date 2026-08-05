import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/msw/server";
import { fetchMethodsSkillsSummary } from "./api";
import {
  __resetAccountUsernameRequiredNotifications,
  ACCOUNT_USERNAME_REQUIRED_ERROR_CODE,
  subscribeToAccountUsernameRequired,
} from "./accountUsernameRequirement";

describe("api account username requirement handling", () => {
  afterEach(() => {
    __resetAccountUsernameRequiredNotifications();
  });

  it("notifies listeners when the backend requires an account username", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAccountUsernameRequired(listener);

    server.use(
      http.get("*/methods/skills/summary", () =>
        HttpResponse.json(
          {
            status: "error",
            error: {
              code: ACCOUNT_USERNAME_REQUIRED_ERROR_CODE,
              message:
                "You must set an account username before using this service.",
            },
          },
          { status: 403 },
        ),
      ),
    );

    await expect(fetchMethodsSkillsSummary("zezima")).rejects.toMatchObject({
      code: ACCOUNT_USERNAME_REQUIRED_ERROR_CODE,
      message: expect.stringContaining(
        "You must set an account username before using this service.",
      ),
    });

    expect(listener).toHaveBeenCalledWith({
      message: "You must set an account username before using this service.",
    });

    unsubscribe();
  });
});
