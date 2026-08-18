import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "@/App";
import { CURRENT_TERMS_VERSION } from "@/lib/termsOfUse";
import { createTestQueryClient } from "../utils/render";

function renderApp() {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("critical flow: registration terms acceptance", () => {
  it("navigates from login to the standalone registration screen with legal links", async () => {
    window.history.pushState({}, "", "/login");

    renderApp();

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByLabelText("Repeat password")).toBeInTheDocument();

    const termsLink = screen
      .getAllByRole("link", { name: /terms of use/i })
      .find((link) => link.getAttribute("target") === "_blank");
    const privacyLink = screen
      .getAllByRole("link", { name: /privacy policy/i })
      .find((link) => link.getAttribute("target") === "_blank");

    expect(termsLink).toBeDefined();
    expect(privacyLink).toBeDefined();
    expect(termsLink).toHaveAttribute("href", "/terms-of-use");
    expect(termsLink).toHaveAttribute("target", "_blank");
    expect(termsLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(privacyLink).toHaveAttribute("href", "/privacy-policy");
    expect(privacyLink).toHaveAttribute("target", "_blank");
    expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer");

    await user.click(termsLink);

    expect(screen.getByLabelText("Repeat password")).toBeInTheDocument();
  });

  it("blocks standalone registration until the terms checkbox is accepted", async () => {
    const signUp = vi.fn(async () => ({
      needsEmailConfirmation: true,
      error: null,
    }));
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      signUp,
      session: null,
      user: null,
      isLoading: false,
    });

    window.history.pushState({}, "", "/login");
    renderApp();

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Create account" }),
    );
    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.type(screen.getByLabelText("Repeat password"), "hunter2");

    await user.click(screen.getByRole("button", { name: "Create account" }));

    const termsCheckbox = screen.getByRole("checkbox", {
      name: /i have read and accept the current terms of use/i,
    });

    expect(signUp).not.toHaveBeenCalled();
    expect(
      screen.getByText("You must accept the Terms of Use to create an account."),
    ).toBeInTheDocument();
    expect(termsCheckbox).toHaveAttribute("aria-invalid", "true");
    expect(termsCheckbox).toHaveFocus();
  });

  it("sends the accepted terms version from the standalone registration screen", async () => {
    const signUp = vi.fn(async () => ({
      needsEmailConfirmation: true,
      error: null,
    }));
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      signUp,
      session: null,
      user: null,
      isLoading: false,
    });

    window.history.pushState({}, "", "/login");
    renderApp();

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Create account" }),
    );
    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.type(screen.getByLabelText("Repeat password"), "hunter2");
    await user.click(
      screen.getByRole("checkbox", {
        name: /i have read and accept the current terms of use/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(signUp).toHaveBeenCalledWith(
      "user@example.com",
      "hunter2",
      CURRENT_TERMS_VERSION
    );
    expect(
      await screen.findByText(
        "Account created. Check your email to confirm registration. After confirmation, you will continue with account setup.",
      ),
    ).toBeInTheDocument();
  });
});
