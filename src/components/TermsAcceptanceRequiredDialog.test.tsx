import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders } from "../../tests/utils/render";
import { TermsAcceptanceRequiredDialog } from "./TermsAcceptanceRequiredDialog";
import {
  __resetTermsAcceptanceRequiredNotifications,
  notifyTermsAcceptanceRequired,
} from "@/lib/termsAcceptanceRequirement";

describe("TermsAcceptanceRequiredDialog", () => {
  afterEach(() => {
    __resetTermsAcceptanceRequiredNotifications();
  });

  it("opens on notification and sends the user to unified onboarding", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <>
        <TermsAcceptanceRequiredDialog />
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

    notifyTermsAcceptanceRequired({
      message:
        "You must accept the current Terms of Service before using this service.",
    });

    expect(
      await screen.findByText("Terms acceptance required"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Review terms" }));

    expect(await screen.findByText("Onboarding view")).toBeInTheDocument();
    expect(screen.queryByText("Methods view")).not.toBeInTheDocument();
  });
});
