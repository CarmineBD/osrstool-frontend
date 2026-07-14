import { describe, expect, it, vi } from "vitest";
import {
  fetchAdminJobs,
  fetchAdminOverview,
  refreshAdminMethodProfits,
  runAdminItemsSync,
} from "./admin";

describe("admin api", () => {
  it("fetches the admin overview data", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            counts: {
              usersRegistered: 10,
              items: 20,
              quests: 30,
              methods: {
                total: 40,
                enabled: 32,
                disabled: 8,
              },
              variants: {
                total: 50,
                enabled: 42,
                disabled: 8,
              },
              enabledMethodVariantsBySkill: [
                { skill: "Magic", variants: 9 },
                { skill: "Mining", variants: 4 },
              ],
            },
            latestExecutions: [],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const overview = await fetchAdminOverview();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;

    expect(requestUrl).toContain("/admin/overview");
    expect(overview.counts.methods.enabled).toBe(32);
    expect(overview.counts.enabledMethodVariantsBySkill).toEqual([
      { skill: "Magic", variants: 9 },
      { skill: "Mining", variants: 4 },
    ]);

    fetchSpy.mockRestore();
  });

  it("ignores malformed enabledMethodVariantsBySkill entries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            counts: {
              usersRegistered: 10,
              items: 20,
              quests: 30,
              methods: {
                total: 40,
                enabled: 32,
                disabled: 8,
              },
              variants: {
                total: 50,
                enabled: 42,
                disabled: 8,
              },
              enabledMethodVariantsBySkill: [
                { skill: "Attack", variants: 7 },
                { skill: " Agility ", variants: "3" },
                { skill: "", variants: 2 },
                { skill: "Magic", variants: null },
                { variants: 1 },
                null,
              ],
            },
            latestExecutions: [],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const overview = await fetchAdminOverview();

    expect(overview.counts.enabledMethodVariantsBySkill).toEqual([
      { skill: "Attack", variants: 7 },
      { skill: "Agility", variants: 3 },
    ]);

    fetchSpy.mockRestore();
  });

  it("passes jobs filters to the admin jobs endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          meta: {
            limit: 20,
            scriptName: "items:mapping:sync",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const jobs = await fetchAdminJobs({
      limit: 20,
      scriptName: "items:mapping:sync",
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

    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("scriptName")).toBe("items:mapping:sync");
    expect(jobs.meta.scriptName).toBe("items:mapping:sync");

    fetchSpy.mockRestore();
  });

  it("posts the recommended payload for item sync", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "execution-1",
            scriptName: "items:mapping:sync",
            status: "running",
            trigger: "manual",
            requestedByUserId: "user-1",
            params: { source: "mapping", dryRun: false },
            result: null,
            errorMessage: null,
            startedAt: "2026-07-14T10:00:00.000Z",
            finishedAt: null,
            durationMs: null,
            createdAt: "2026-07-14T10:00:00.000Z",
            updatedAt: "2026-07-14T10:00:00.000Z",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await runAdminItemsSync({
      source: "mapping",
      dryRun: false,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInit = fetchSpy.mock.calls[0]?.[1];

    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.body).toBe(
      JSON.stringify({
        source: "mapping",
        dryRun: false,
      }),
    );

    fetchSpy.mockRestore();
  });

  it("posts to the method profits refresh endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "execution-2",
            scriptName: "method-profits:refresh",
            status: "running",
            trigger: "manual",
            requestedByUserId: "user-1",
            params: null,
            result: { refreshed: true },
            errorMessage: null,
            startedAt: "2026-07-14T10:05:00.000Z",
            finishedAt: null,
            durationMs: null,
            createdAt: "2026-07-14T10:05:00.000Z",
            updatedAt: "2026-07-14T10:05:00.000Z",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await refreshAdminMethodProfits();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInput = fetchSpy.mock.calls[0]?.[0];
    const requestUrl =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;

    expect(requestUrl).toContain("/admin/refresh/method-profits");
    expect(fetchSpy.mock.calls[0]?.[1]?.method).toBe("POST");

    fetchSpy.mockRestore();
  });
});
