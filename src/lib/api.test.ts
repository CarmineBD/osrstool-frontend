import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/msw/server";
import { buildMethodUpdatePayload, fetchMethodsSkillsSummary } from "./api";
import {
  __resetAccountUsernameRequiredNotifications,
  ACCOUNT_USERNAME_REQUIRED_ERROR_CODE,
  subscribeToAccountUsernameRequired,
} from "./accountUsernameRequirement";
import {
  __resetTermsAcceptanceRequiredNotifications,
  subscribeToTermsAcceptanceRequired,
  TERMS_ACCEPTANCE_REQUIRED_ERROR_CODE,
} from "./termsAcceptanceRequirement";

describe("api account username requirement handling", () => {
  afterEach(() => {
    __resetAccountUsernameRequiredNotifications();
    __resetTermsAcceptanceRequiredNotifications();
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

  it("notifies listeners when the backend requires current terms acceptance", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToTermsAcceptanceRequired(listener);

    server.use(
      http.get("*/methods/skills/summary", () =>
        HttpResponse.json(
          {
            status: "error",
            error: {
              code: TERMS_ACCEPTANCE_REQUIRED_ERROR_CODE,
              message:
                "You must accept the current Terms of Service before using this service.",
            },
          },
          { status: 403 },
        ),
      ),
    );

    await expect(fetchMethodsSkillsSummary("zezima")).rejects.toMatchObject({
      code: TERMS_ACCEPTANCE_REQUIRED_ERROR_CODE,
      message: expect.stringContaining(
        "You must accept the current Terms of Service before using this service.",
      ),
    });

    expect(listener).toHaveBeenCalledWith({
      message:
        "You must accept the current Terms of Service before using this service.",
    });

    unsubscribe();
  });
});

describe("api method payloads", () => {
  it("allows decimal actionsPerHour values within range", () => {
    expect(
      buildMethodUpdatePayload(
        {
          name: "Test method",
          category: "combat",
          description: "Test",
          enabled: true,
          icon_id: 4151,
        },
        [
          {
            label: "Main",
            icon_id: 11284,
            members: true,
            actionsPerHour: 12.5,
            actionType: "kills",
            xpHour: [],
            requirements: {},
            inputs: [],
            outputs: [],
          },
        ],
      ).variants[0]?.actionsPerHour,
    ).toBe(12.5);
  });
});
