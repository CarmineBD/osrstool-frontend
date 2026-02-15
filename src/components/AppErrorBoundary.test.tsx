import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

function ThrowOnRender() {
  throw new Error("boom");
}

describe("AppErrorBoundary", () => {
  it("shows the fallback UI when a child throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <ThrowOnRender />
      </AppErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText("The app hit an unexpected error. You can retry or return home.")
    ).toBeInTheDocument();

    errorSpy.mockRestore();
  });
});
