import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../tests/utils/render";

vi.mock("@/auth/AuthProvider", () => ({
  __resetAuthMockState: vi.fn(),
  useAuth: () => ({
    session: {
      user: {
        id: "user-1",
        email: "admin@example.com",
      },
    },
  }),
}));

vi.mock("@/components/AdminPresenceHistoryCard", () => ({
  AdminPresenceHistoryCard: () => <div>Presence history chart</div>,
}));

vi.mock("@/lib/admin", () => ({
  fetchAdminOverview: vi.fn().mockResolvedValue({
    counts: {
      usersRegistered: 1,
      items: 2,
      quests: 3,
      activeSessions: null,
      methods: { total: 4, enabled: 3, disabled: 1 },
      variants: { total: 5, enabled: 4, disabled: 1 },
      enabledMethodVariantsBySkill: [],
    },
    latestExecutions: [],
    latestCatalog: {
      items: [],
      quests: [],
    },
  }),
  fetchAdminJobs: vi.fn().mockResolvedValue({
    data: [],
    meta: { limit: 20, scriptName: null },
  }),
  fetchAdminPresenceHistory: vi.fn().mockResolvedValue({
    range: "72h",
    granularity: "hour",
    timezone: "UTC",
    points: [],
  }),
  runAdminItemsSync: vi.fn(),
  refreshAdminMethodProfits: vi.fn(),
}));

vi.mock("@/lib/me", () => ({
  fetchMe: vi.fn().mockResolvedValue({
    data: {
      role: "super_admin",
    },
  }),
}));

describe("AdminPage", () => {
  it("renders Unavailable when activeSessions is null", async () => {
    const module = await import("./AdminPage");

    renderWithProviders(<module.AdminPage />, { route: "/admin" });

    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Presence history chart")).toBeInTheDocument();
  });
});
