import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createTestQueryClient } from "../../tests/utils/render";
import { AccountOsrsUsernamePage } from "./AccountOsrsUsernamePage";

type UsernameContextTestModule = typeof import("@/contexts/UsernameContext") & {
  __setUsernameMockState: (partial: Record<string, unknown>) => void;
  __getUsernameMockSpies: () => {
    lookupPlayerSpy: ReturnType<typeof vi.fn>;
  };
};

function renderPage(
  initialEntry:
    | string
    | {
        pathname: string;
        state?: {
          from?: {
            pathname?: string;
            search?: string;
            hash?: string;
          };
        };
      } = "/account/osrs-username",
) {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/account/osrs-username"
            element={<AccountOsrsUsernamePage />}
          />
          <Route path="/roadmaps" element={<div>Roadmaps destination</div>} />
          <Route path="/account" element={<div>Account destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AccountOsrsUsernamePage", () => {
  it("saves the optional OSRS username and continues", async () => {
    const usernameContextModule =
      (await import("@/contexts/UsernameContext")) as UsernameContextTestModule;
    usernameContextModule.__setUsernameMockState({
      username: "",
      userError: null,
    });
    const { lookupPlayerSpy } =
      usernameContextModule.__getUsernameMockSpies();

    renderPage({
      pathname: "/account/osrs-username",
      state: {
        from: {
          pathname: "/roadmaps",
        },
      },
    });

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("OSRS username"), "CarmiX");
    await user.click(screen.getByRole("button", { name: "Save username" }));

    expect(lookupPlayerSpy).toHaveBeenCalledWith("CarmiX");
    expect(
      await screen.findByText("Roadmaps destination"),
    ).toBeInTheDocument();
  });

  it("lets the user skip the optional username", async () => {
    const usernameContextModule =
      (await import("@/contexts/UsernameContext")) as UsernameContextTestModule;
    usernameContextModule.__setUsernameMockState({
      username: "",
      userError: null,
    });
    const { lookupPlayerSpy } =
      usernameContextModule.__getUsernameMockSpies();

    renderPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Skip for now" }));

    expect(lookupPlayerSpy).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Account destination"),
    ).toBeInTheDocument();
  });

  it("stays on the page when the player lookup fails", async () => {
    const usernameContextModule =
      (await import("@/contexts/UsernameContext")) as UsernameContextTestModule;
    usernameContextModule.__setUsernameMockState({
      username: "",
      userError: null,
    });
    const { lookupPlayerSpy } =
      usernameContextModule.__getUsernameMockSpies();
    lookupPlayerSpy.mockResolvedValueOnce(null);

    renderPage({
      pathname: "/account/osrs-username",
      state: { from: { pathname: "/roadmaps" } },
    });

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("OSRS username"), "Missing");
    await user.click(screen.getByRole("button", { name: "Save username" }));

    expect(lookupPlayerSpy).toHaveBeenCalledWith("Missing");
    expect(screen.queryByText("Roadmaps destination")).not.toBeInTheDocument();
  });
});
