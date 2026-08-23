import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UsernameLookupErrorMessage } from "./UsernameLookupErrorMessage";

describe("UsernameLookupErrorMessage", () => {
  it("shows WikiSync guidance for wiki lookup failures", () => {
    render(
      <UsernameLookupErrorMessage message="RuneScape Wiki lookup failed for this username." />,
    );

    expect(
      screen.getByText("RuneScape Wiki lookup failed for this username."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Make sure the RuneLite `WikiSync` plugin is installed and enabled/,
      ),
    ).toBeInTheDocument();
  });

  it("does not show WikiSync guidance for login-required notices", () => {
    render(
      <UsernameLookupErrorMessage message="sign-in/login to fetch data by osrs usernames" />,
    );

    expect(
      screen.queryByText(/RuneLite `WikiSync` plugin/i),
    ).not.toBeInTheDocument();
  });
});
