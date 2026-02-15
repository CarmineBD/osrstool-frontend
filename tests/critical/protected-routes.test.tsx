import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { server } from "../msw/server";
import { renderWithProviders } from "../utils/render";

describe("critical flow: protected routes and redirects", () => {
  it("redirects unauthenticated users to login", async () => {
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      session: null,
      user: null,
      isLoading: false,
    });

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<div>Account view</div>} />
        </Route>
        <Route path="/login" element={<div>Login view</div>} />
      </Routes>,
      { route: "/account" }
    );

    expect(await screen.findByText("Login view")).toBeInTheDocument();
    expect(screen.queryByText("Account view")).not.toBeInTheDocument();
  });

  it("shows forbidden page when role is insufficient", async () => {
    const authProviderModule = await import("@/auth/AuthProvider");
    authProviderModule.__setAuthMockState({
      session: {
        access_token: "token-1",
      },
      user: {
        id: "user-1",
        email: "test@example.com",
      },
      isLoading: false,
    });

    server.use(
      http.get("*/users/me", () =>
        HttpResponse.json({
          data: {
            id: "user-1",
            email: "test@example.com",
            role: "user",
          },
        })
      )
    );

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute requiredRole="super_admin" />}>
          <Route path="/moneyMakingMethod/new" element={<div>Create form</div>} />
        </Route>
      </Routes>,
      { route: "/moneyMakingMethod/new" }
    );

    expect(await screen.findByText("403 - Super admin only")).toBeInTheDocument();
    expect(screen.queryByText("Create form")).not.toBeInTheDocument();
  });
});
