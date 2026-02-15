import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer(
  http.get("*/users/me", () =>
    HttpResponse.json({
      data: {
        id: "user-1",
        email: "test@example.com",
        role: "user",
      },
    })
  ),
  http.get("*/me", () =>
    HttpResponse.json({
      data: {
        id: "user-1",
        email: "test@example.com",
        role: "user",
      },
    })
  ),
  http.get("*/achievement-diaries", () => HttpResponse.json([])),
  http.get("*/achievement_diaries", () => HttpResponse.json([])),
  http.get("*/quests", () => HttpResponse.json([])),
  http.get("*/skills", () => HttpResponse.json([]))
);
