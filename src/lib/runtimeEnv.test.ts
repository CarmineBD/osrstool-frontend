import { describe, expect, it } from "vitest";
import { getRuntimeEnvironmentLabel } from "@/lib/runtimeEnv";

describe("getRuntimeEnvironmentLabel", () => {
  it("returns LOCAL for local development hosts", () => {
    expect(getRuntimeEnvironmentLabel("localhost", false)).toBe("LOCAL");
    expect(getRuntimeEnvironmentLabel("127.0.0.1", false)).toBe("LOCAL");
    expect(getRuntimeEnvironmentLabel("::1", false)).toBe("LOCAL");
  });

  it("returns LOCAL when vite dev mode is enabled", () => {
    expect(getRuntimeEnvironmentLabel("app.example.com", true)).toBe("LOCAL");
  });

  it("returns TST for tst and staging hosts", () => {
    expect(getRuntimeEnvironmentLabel("tst.example.com", false)).toBe("TST");
    expect(getRuntimeEnvironmentLabel("app.tst.example.com", false)).toBe(
      "TST",
    );
    expect(getRuntimeEnvironmentLabel("staging.example.com", false)).toBe(
      "TST",
    );
  });

  it("returns null for production-like hosts", () => {
    expect(getRuntimeEnvironmentLabel("osrstool.com", false)).toBeNull();
  });
});
