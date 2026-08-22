import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders } from "../../tests/utils/render";
import { AccountUsernameRequiredDialog } from "./AccountUsernameRequiredDialog";
import {
  __resetAccountUsernameRequiredNotifications,
  notifyAccountUsernameRequired,
} from "@/lib/accountUsernameRequirement";

describe("AccountUsernameRequiredDialog", () => {
  afterEach(() => {
    __resetAccountUsernameRequiredNotifications();
  });

  it("opens on notification and sends the user to onboarding", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <>
        <AccountUsernameRequiredDialog />
        <Routes>
          <Route path="/allMethods" element={<div>Methods view</div>} />
          <Route
            path="/account/onboarding"
            element={<div>Onboarding view</div>}
          />
        </Routes>
      </>,
      { route: "/allMethods" },
    );

    notifyAccountUsernameRequired({
      message: "You must set an account username before using this service.",
    });

    expect(await screen.findByText("Account username required")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Choose account username" }),
    );

    expect(await screen.findByText("Onboarding view")).toBeInTheDocument();
    expect(screen.queryByText("Methods view")).not.toBeInTheDocument();
  });

  it("closes when a different account becomes active", async () => {
    const authProviderModule = (await import("@/auth/AuthProvider")) as typeof import("@/auth/AuthProvider") & {
      __setAuthMockState: (partial: Record<string, unknown>) => void;
    };
    authProviderModule.__setAuthMockState({
      session: { user: { id: "account-without-username" } },
    });

    const view = renderWithProviders(
      <>
        <AccountUsernameRequiredDialog />
        <Routes>
          <Route path="/allMethods" element={<div>Methods view</div>} />
        </Routes>
      </>,
      { route: "/allMethods" },
    );

    notifyAccountUsernameRequired({
      message: "You must set an account username before using this service.",
      userId: "account-without-username",
    });

    expect(await screen.findByText("Account username required")).toBeInTheDocument();

    authProviderModule.__setAuthMockState({
      session: { user: { id: "account-with-username" } },
    });
    view.rerender(
      <>
        <AccountUsernameRequiredDialog />
        <Routes>
          <Route path="/allMethods" element={<div>Methods view</div>} />
        </Routes>
      </>,
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Account username required"),
      ).not.toBeInTheDocument();
    });
  });
});
