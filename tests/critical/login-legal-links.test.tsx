import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
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
  it("shows the required terms checkbox with accessible legal links and keeps the form intact", async () => {
    window.history.pushState({}, "", "/login");

    renderApp();

    const user = userEvent.setup();
    const emailInput = await screen.findByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(emailInput, "user@example.com");
    await user.type(passwordInput, "hunter2");

    const consentHint = screen.getByText("Required only to create an account.");
    const consentSection = consentHint.parentElement;

    expect(consentSection).not.toBeNull();

    const consentContent = within(consentSection as HTMLElement);
    const createAccountButton = screen.getByRole("button", {
      name: "Create account",
    });
    const termsCheckbox = consentContent.getByRole("checkbox", {
      name: /i accept the terms of use/i,
    });
    const termsLink = consentContent.getByRole("link", {
      name: /terms of use/i,
    });
    const privacyLink = consentContent.getByRole("link", {
      name: /privacy policy/i,
    });

    expect(createAccountButton).toHaveAttribute(
      "aria-describedby",
      "sign-up-terms-hint"
    );
    expect(termsCheckbox).not.toBeChecked();
    expect(termsLink).toHaveAttribute("href", "/terms-of-use");
    expect(termsLink).toHaveAttribute("target", "_blank");
    expect(termsLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(privacyLink).toHaveAttribute("href", "/privacy-policy");
    expect(privacyLink).toHaveAttribute("target", "_blank");
    expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer");

    await user.click(termsLink);

    expect(screen.getByLabelText("Email")).toHaveValue("user@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("hunter2");
  });

  it("blocks account creation until the terms checkbox is accepted", async () => {
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
    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");

    await user.click(screen.getByRole("button", { name: "Create account" }));

    const termsCheckbox = screen.getByRole("checkbox", {
      name: /i accept the terms of use/i,
    });

    expect(signUp).not.toHaveBeenCalled();
    expect(
      screen.getByText("You must accept the Terms of Use to create an account.")
    ).toBeInTheDocument();
    expect(termsCheckbox).toHaveAttribute("aria-invalid", "true");
    expect(termsCheckbox).toHaveFocus();
  });

  it("sends the accepted terms version with the registration request", async () => {
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
    await user.type(await screen.findByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(
      screen.getByRole("checkbox", { name: /i accept the terms of use/i })
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(signUp).toHaveBeenCalledWith(
      "user@example.com",
      "hunter2",
      CURRENT_TERMS_VERSION
    );
    expect(
      await screen.findByText("Account created. Check your email to confirm registration.")
    ).toBeInTheDocument();
  });
});
