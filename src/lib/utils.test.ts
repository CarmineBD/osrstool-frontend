import { describe, expect, it } from "vitest";
import { formatElapsedTimeFromUnix } from "./utils";

const NOW_MS = Date.UTC(2026, 2, 1, 12, 0, 0);

describe("formatElapsedTimeFromUnix", () => {
  it("formats minutes and seconds for differences under one hour", () => {
    const elapsedSeconds = 10 * 60 + 5;
    const unixSeconds = Math.floor((NOW_MS - elapsedSeconds * 1000) / 1000);

    expect(formatElapsedTimeFromUnix(unixSeconds, NOW_MS)).toBe("10m 5s ago");
  });

  it("formats hours and minutes for differences between one hour and one day", () => {
    const elapsedSeconds = 2 * 60 * 60 + 30 * 60;
    const unixMilliseconds = NOW_MS - elapsedSeconds * 1000;

    expect(formatElapsedTimeFromUnix(unixMilliseconds, NOW_MS)).toBe(
      "2h 30m ago"
    );
  });

  it("formats days and hours for differences between one day and one week", () => {
    const elapsedSeconds = 3 * 24 * 60 * 60 + 4 * 60 * 60;
    const unixSeconds = Math.floor((NOW_MS - elapsedSeconds * 1000) / 1000);

    expect(formatElapsedTimeFromUnix(unixSeconds, NOW_MS)).toBe("3d 4h ago");
  });

  it("formats weeks and days for differences between one week and one month", () => {
    const elapsedSeconds = 2 * 7 * 24 * 60 * 60 + 3 * 24 * 60 * 60;
    const unixMilliseconds = NOW_MS - elapsedSeconds * 1000;

    expect(formatElapsedTimeFromUnix(unixMilliseconds, NOW_MS)).toBe(
      "2w 3d ago"
    );
  });

  it("formats years and months for differences over one year", () => {
    const elapsedSeconds = 365 * 24 * 60 * 60 + 2 * 30 * 24 * 60 * 60;
    const unixSeconds = Math.floor((NOW_MS - elapsedSeconds * 1000) / 1000);

    expect(formatElapsedTimeFromUnix(unixSeconds, NOW_MS)).toBe("1Y 2M ago");
  });

  it("auto-detects unix timestamps in seconds and milliseconds", () => {
    const elapsedSeconds = 2 * 60 * 60 + 15 * 60;
    const unixMilliseconds = NOW_MS - elapsedSeconds * 1000;
    const unixSeconds = Math.floor(unixMilliseconds / 1000);

    expect(formatElapsedTimeFromUnix(unixSeconds, NOW_MS)).toBe("2h 15m ago");
    expect(formatElapsedTimeFromUnix(unixMilliseconds, NOW_MS)).toBe(
      "2h 15m ago"
    );
  });
});
