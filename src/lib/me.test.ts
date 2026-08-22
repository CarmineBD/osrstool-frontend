import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/msw/server";
import { deleteCurrentUser, MeRequestError } from "./me";

describe("me API helpers", () => {
  it("deletes the current user through /users/me", async () => {
    let called = false;

    server.use(
      http.delete("*/users/me", () => {
        called = true;
        return HttpResponse.json({
          data: {
            deleted: true,
          },
        });
      }),
    );

    await expect(deleteCurrentUser()).resolves.toEqual({
      data: {
        deleted: true,
      },
    });
    expect(called).toBe(true);
  });

  it("falls back to /me when /users/me is not available", async () => {
    let legacyCalled = false;

    server.use(
      http.delete("*/users/me", () => HttpResponse.json({}, { status: 404 })),
      http.delete("*/me", () => {
        legacyCalled = true;
        return HttpResponse.json({
          data: {
            deleted: true,
          },
        });
      }),
    );

    await expect(deleteCurrentUser()).resolves.toEqual({
      data: {
        deleted: true,
      },
    });
    expect(legacyCalled).toBe(true);
  });

  it("surfaces backend deletion errors with the parsed message", async () => {
    server.use(
      http.delete("*/users/me", () =>
        HttpResponse.json(
          {
            error: {
              message: "Could not delete account right now.",
            },
          },
          { status: 503 },
        ),
      ),
    );

    await expect(deleteCurrentUser()).rejects.toMatchObject({
      message: "Could not delete account right now.",
      status: 503,
    } satisfies Partial<MeRequestError>);
  });
});
