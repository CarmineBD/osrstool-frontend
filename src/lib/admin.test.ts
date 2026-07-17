import { describe, expect, it, vi } from "vitest";
import { fetchAdminJobs } from "@/lib/admin";

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
});
