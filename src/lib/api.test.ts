import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/msw/server";
import {
  buildMethodUpdatePayload,
  fetchMethods,
  fetchMethodsSkillsSummary,
} from "./api";
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
      http.post("*/methods/skills/summary", () =>
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

    await expect(fetchMethodsSkillsSummary()).rejects.toMatchObject({
      code: ACCOUNT_USERNAME_REQUIRED_ERROR_CODE,
      message: expect.stringContaining(
        "You must set an account username before using this service.",
      ),
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "You must set an account username before using this service.",
      }),
    );

    unsubscribe();
  });

  it("notifies listeners when the backend requires current terms acceptance", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToTermsAcceptanceRequired(listener);

    server.use(
      http.post("*/methods/skills/summary", () =>
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

    await expect(fetchMethodsSkillsSummary()).rejects.toMatchObject({
      code: TERMS_ACCEPTANCE_REQUIRED_ERROR_CODE,
      message: expect.stringContaining(
        "You must accept the current Terms of Service before using this service.",
      ),
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "You must accept the current Terms of Service before using this service.",
      }),
    );

    unsubscribe();
  });
});

describe("api method payloads", () => {
  it("omits the enabled query parameter when no filter is requested", async () => {
    let receivedEnabled: string | null = "not-called";

    server.use(
      http.post("*/methods/skills/summary", ({ request }) => {
        receivedEnabled = new URL(request.url).searchParams.get("enabled");
        return HttpResponse.json({ data: {} });
      }),
    );

    await fetchMethodsSkillsSummary();

    expect(receivedEnabled).toBeNull();
  });

  it("normalizes bigint icon ids returned as strings", async () => {
    server.use(
      http.post("*/methods/search", () =>
        HttpResponse.json({
          data: {
            methods: [
              {
                id: "method-1",
                slug: "test-method",
                name: "Test method",
                category: "combat",
                icon_id: "4151",
                iconSource: "item",
                variants: [
                  {
                    id: "variant-1",
                    label: "Main",
                    icon_id: "11284",
                    iconSource: "item",
                    inputs: [],
                    outputs: [],
                  },
                ],
              },
            ],
          },
        }),
      ),
    );

    const response = await fetchMethods();

    expect(response.methods[0]?.icon_id).toBe(4151);
    expect(response.methods[0]?.variants[0]?.icon_id).toBe(11284);
  });

  it("normalizes skill summary variant icon ids returned as strings", async () => {
    server.use(
      http.post("*/methods/skills/summary", () =>
        HttpResponse.json({
          data: {
            magic: {
              bestProfit: {
                id: "method-1",
                name: "Test method",
                variants: [
                  {
                    id: "variant-1",
                    label: "Main",
                    icon_id: "11284",
                    iconSource: "item",
                    members: true,
                    xpHour: [],
                    requirements: {},
                  },
                ],
              },
            },
          },
        }),
      ),
    );

    const response = await fetchMethodsSkillsSummary();

    expect(response.data.magic?.bestProfit?.variants[0]?.icon_id).toBe(11284);
  });

  it("allows decimal actionsPerHour values within range", () => {
    expect(
      buildMethodUpdatePayload(
        {
          name: "Test method",
          category: "combat",
          description: "Test",
          enabled: true,
          icon_id: 4151,
          iconSource: "item",
        },
        [
          {
            label: "Main",
            icon_id: 11284,
            iconSource: "item",
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

  it("maps dynamic variants to tick-based action and cycle payloads", () => {
    const payload = buildMethodUpdatePayload(
      {
        name: "Dynamic method",
        category: "combat",
        description: "Test",
        enabled: true,
        icon_id: 4151,
        iconSource: "item",
      },
      [
        {
          label: "Dynamic",
          icon_id: 11284,
          iconSource: "item",
          members: true,
          calculationMode: "dynamic",
          xpHour: [],
          requirements: {},
          inputs: [],
          outputs: [],
          dynamicAction: {
            name: "Kill a monster",
            rollIntervalTicks: 4,
            inputs: [{ id: 1, quantity: 2, reason: "Not sent" }],
            outputs: [{ id: 2, quantity: 1 }],
            xpGained: [{ skillId: 3, skill: "combat", experience: 50 }],
          },
          cycleSteps: [
            {
              name: "Kill",
              stepOrderPosition: 8,
              clicksMade: 2,
              actionsMade: 1,
              durationTicks: 4,
              isAfk: false,
            },
            {
              name: "Wait",
              stepOrderPosition: 2,
              clicksMade: 0,
              actionsMade: 0,
              durationTicks: 0,
              isAfk: true,
            },
          ],
        },
      ],
    );

    expect(payload.variants[0]).toEqual({
      label: "Dynamic",
      icon_id: 11284,
      iconSource: "item",
      members: true,
      calculationMode: "dynamic",
      requirements: {},
      dynamicAction: {
        name: "Kill a monster",
        rollIntervalTicks: 4,
        inputs: [{ id: 1, quantity: 2 }],
        outputs: [{ id: 2, quantity: 1 }],
        xpGained: [{ skillId: 3, experience: 50 }],
      },
      cycleSteps: [
        {
          name: "Kill",
          stepOrderPosition: 1,
          clicksMade: 2,
          actionsMade: 1,
          isAfk: false,
        },
        {
          name: "Wait",
          stepOrderPosition: 2,
          clicksMade: 0,
          durationTicks: 0,
          isAfk: true,
        },
      ],
    });
  });
});
