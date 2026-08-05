import { describe, expect, it, vi } from "vitest";
import {
  fetchAdminJobs,
  fetchAdminOverview,
  fetchAdminPresenceHistory,
} from "@/lib/admin";

describe("admin api helpers", () => {
  it("truncates long script name filters before fetching jobs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [], meta: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await fetchAdminJobs({
      limit: 20,
      scriptName: "a".repeat(220),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
    const url = new URL(requestUrl, window.location.origin);

    expect(url.searchParams.get("scriptName")).toBe("a".repeat(160));

    fetchSpy.mockRestore();
  });

  it("normalizes activeSessions as null when overview cannot resolve it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            counts: {
              usersRegistered: 1,
              items: 2,
              quests: 3,
              activeSessions: null,
              methods: { total: 4, enabled: 3, disabled: 1 },
              variants: { total: 5, enabled: 4, disabled: 1 },
              enabledMethodVariantsBySkill: [],
            },
            latestExecutions: [],
            latestCatalog: { items: [], quests: [] },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const overview = await fetchAdminOverview();

    expect(overview.counts.activeSessions).toBeNull();

    fetchSpy.mockRestore();
  });

  it("parses admin presence history points including the provisional flag", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            range: "72h",
            granularity: "hour",
            timezone: "UTC",
            points: [
              {
                bucketStart: "2026-08-05T14:00:00.000Z",
                peakOnline: 12,
                provisional: false,
              },
              {
                bucketStart: "2026-08-05T15:00:00.000Z",
                peakOnline: 17,
                provisional: true,
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const history = await fetchAdminPresenceHistory("72h");

    expect(history.range).toBe("72h");
    expect(history.points[1]).toEqual({
      bucketStart: "2026-08-05T15:00:00.000Z",
      peakOnline: 17,
      provisional: true,
    });

    fetchSpy.mockRestore();
  });
});
