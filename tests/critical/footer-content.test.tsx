import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "@/App";
import { OFFICIAL_DISCORD_URL } from "@/lib/community";
import {
  FOOTER_AFFILIATION_NOTICE,
  PROJECT_CONTACT_EMAIL,
  PROJECT_CONTACT_MAILTO,
} from "@/lib/legalNotice";
import { createTestQueryClient } from "../utils/render";

function renderApp() {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("critical flow: footer content", () => {
  it("keeps working footer links, legal contact details, and the Discord entry point", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/");

    renderApp();

    const footer = screen.getByRole("contentinfo");

    expect(footer).not.toHaveTextContent(/\[todo\]/i);
    expect(footer).not.toHaveTextContent(/coming soon/i);
    expect(footer).not.toHaveTextContent(/\(soon\)/i);
    expect(footer).not.toHaveTextContent(/example\.com/i);
    expect(
      within(footer).queryByRole("heading", { name: "Resources" }),
    ).not.toBeInTheDocument();
    expect(
      within(footer).queryByRole("heading", { name: "Community" }),
    ).not.toBeInTheDocument();
    expect(within(footer).queryByText("Status")).not.toBeInTheDocument();
    expect(within(footer).queryByText("API docs")).not.toBeInTheDocument();
    expect(within(footer).queryByText("X / Twitter")).not.toBeInTheDocument();
    expect(within(footer).queryByText("Reddit")).not.toBeInTheDocument();

    const footerDiscordLink = within(footer).getByRole("link", {
      name: "Discord",
    });
    expect(footerDiscordLink).toHaveAttribute("href", OFFICIAL_DISCORD_URL);
    expect(footerDiscordLink).toHaveAttribute("target", "_blank");
    expect(footerDiscordLink).toHaveAttribute("rel", "noopener noreferrer");

    const headerDiscordLink = screen.getByRole("link", {
      name: "Join our Discord!",
    });
    expect(headerDiscordLink).toHaveAttribute("href", OFFICIAL_DISCORD_URL);
    expect(headerDiscordLink).toHaveAttribute("target", "_blank");
    expect(headerDiscordLink).toHaveAttribute("rel", "noopener noreferrer");

    await user.hover(headerDiscordLink);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Join our Discord!",
    );

    const contactLink = within(footer).getByRole("link", {
      name: PROJECT_CONTACT_EMAIL,
    });
    expect(contactLink).toHaveAttribute("href", PROJECT_CONTACT_MAILTO);

    expect(
      within(footer).getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/privacy-policy");
    expect(
      within(footer).getByRole("link", { name: "Terms of Use" }),
    ).toHaveAttribute("href", "/terms-of-use");
    expect(
      within(footer).getByRole("link", {
        name: "Cookies and local storage",
      }),
    ).toHaveAttribute("href", "/cookies-and-local-storage");

    for (const link of within(footer).getAllByRole("link")) {
      expect(link).toHaveAttribute("href");
      expect(link.getAttribute("href")).not.toContain("example.com");
    }

    expect(footer).toHaveTextContent(FOOTER_AFFILIATION_NOTICE);
    expect(footer).toHaveTextContent(
      new RegExp(`Copyright ${new Date().getFullYear()} RSMethods\\.`, "i"),
    );
  });
});
