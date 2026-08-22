import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, createTestQueryClient } from "../../tests/utils/render";
import { useMe } from "./useMe";
import { fetchMe } from "@/lib/me";

vi.mock("@/lib/me", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/me")>();
  return {
    ...actual,
    fetchMe: vi.fn(),
  };
});

function ProfileProbe() {
  const { data } = useMe();
  return <div>{data?.data?.username ?? "loading"}</div>;
}

describe("useMe", () => {
  afterEach(() => {
    vi.mocked(fetchMe).mockReset();
  });

  it("does not reuse one account profile for a different signed-in account", async () => {
    const authProviderModule = (await import("@/auth/AuthProvider")) as typeof import("@/auth/AuthProvider") & {
      __setAuthMockState: (partial: Record<string, unknown>) => void;
    };
    authProviderModule.__setAuthMockState({
      session: { user: { id: "account-without-username" } },
    });
    vi.mocked(fetchMe)
      .mockResolvedValueOnce({
        data: {
          id: "account-without-username",
          email: "first@example.com",
          username: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "account-with-username",
          email: "second@example.com",
          username: "complete-account",
        },
      });

    const queryClient = createTestQueryClient();
    const view = renderWithProviders(<ProfileProbe />, { queryClient });

    await waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(1));

    authProviderModule.__setAuthMockState({
      session: { user: { id: "account-with-username" } },
    });
    view.rerender(
      <ProfileProbe />,
    );

    expect(await screen.findByText("complete-account")).toBeInTheDocument();
    expect(fetchMe).toHaveBeenCalledTimes(2);
  });
});
