import { screen } from "@testing-library/react";
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
});
