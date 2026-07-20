import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Alert, AlertPresence } from "./alert";

describe("AlertPresence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "requestAnimationFrame",
      ((callback: FrameRequestCallback) =>
        window.setTimeout(() => callback(16), 0)) as typeof requestAnimationFrame,
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      ((frameId: number) => window.clearTimeout(frameId)) as typeof cancelAnimationFrame,
    );
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps the alert mounted during the exit animation before unmounting it", () => {
    const { rerender, container } = render(
      <AlertPresence present>
        <Alert>Alert content</Alert>
      </AlertPresence>,
    );

    const alertWrapper = container.firstElementChild;
    expect(alertWrapper).toHaveAttribute("data-state", "open");
    expect(screen.getByText("Alert content")).toBeInTheDocument();

    rerender(
      <AlertPresence present={false}>
        <Alert>Alert content</Alert>
      </AlertPresence>,
    );

    expect(screen.getByText("Alert content")).toBeInTheDocument();
    expect(alertWrapper).toHaveAttribute("data-state", "closed");

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.queryByText("Alert content")).not.toBeInTheDocument();
  });
});
