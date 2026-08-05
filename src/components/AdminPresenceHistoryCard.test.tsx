import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminPresenceHistoryCard } from "@/components/AdminPresenceHistoryCard";
import type { AdminPresenceHistoryData } from "@/lib/admin";

describe("AdminPresenceHistoryCard", () => {
  it("renders the provisional helper for the 72h range", () => {
    const data: AdminPresenceHistoryData = {
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
    };

    render(
      <AdminPresenceHistoryCard
        data={data}
        isLoading={false}
        range="72h"
        onRangeChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Current hour (provisional) is included as the last point."),
    ).toBeInTheDocument();
  });

  it("renders finalized helper text for longer ranges", () => {
    const data: AdminPresenceHistoryData = {
      range: "30d",
      granularity: "day",
      timezone: "UTC",
      points: [
        {
          bucketStart: "2026-08-04T00:00:00.000Z",
          peakOnline: 8,
          provisional: false,
        },
      ],
    };

    render(
      <AdminPresenceHistoryCard
        data={data}
        isLoading={false}
        range="30d"
        onRangeChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Only finalized buckets are shown for this range."),
    ).toBeInTheDocument();
  });

  it("forwards range selection changes", async () => {
    const onRangeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <AdminPresenceHistoryCard
        data={{
          range: "72h",
          granularity: "hour",
          timezone: "UTC",
          points: [],
        }}
        isLoading={false}
        range="72h"
        onRangeChange={onRangeChange}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "30d" }));

    expect(onRangeChange).toHaveBeenCalledWith("30d");
  });
});
