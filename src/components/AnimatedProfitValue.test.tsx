import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedProfitValue } from "./AnimatedProfitValue";

describe("AnimatedProfitValue", () => {
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

  it("rolls digits downward when the profit increases", () => {
    const { rerender, container } = render(
      <AnimatedProfitValue value={1_500_000} />,
    );

    expect(screen.getByText("1.5m")).toBeInTheDocument();

    rerender(<AnimatedProfitValue value={1_700_000} />);
    vi.advanceTimersByTime(0);

    const reel = container.querySelector('[data-profit-sequence="567"]');
    expect(reel).toHaveAttribute("data-profit-direction", "down");
    expect(
      container.querySelector('[data-profit-transition="digits"]'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("1.7m")).toBeInTheDocument();
  });

  it("rolls digits upward when the profit decreases", () => {
    const { rerender, container } = render(
      <AnimatedProfitValue value={1_700_000} />,
    );

    rerender(<AnimatedProfitValue value={1_500_000} />);
    vi.advanceTimersByTime(0);

    const reel = container.querySelector('[data-profit-sequence="765"]');
    expect(reel).toHaveAttribute("data-profit-direction", "up");
    expect(screen.getByLabelText("1.5m")).toBeInTheDocument();
  });

  it("falls back to a full swap when the compact format structure changes", () => {
    const { rerender, container } = render(
      <AnimatedProfitValue value={950_000} />,
    );

    rerender(<AnimatedProfitValue value={1_000_000} />);
    vi.advanceTimersByTime(0);

    const swapTransition = container.querySelector(
      '[data-profit-transition="swap"]',
    );

    expect(swapTransition).toHaveAttribute("data-profit-direction", "down");
    expect(screen.getByText("1m")).toBeInTheDocument();
  });
});
