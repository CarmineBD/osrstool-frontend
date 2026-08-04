import { describe, expect, it } from "vitest";
import {
  clearOrphanedScrollLocks,
  hasOpenScrollLockOverlay,
} from "./scrollLock";

describe("scrollLock", () => {
  it("detects open scroll-locking overlays", () => {
    document.body.innerHTML =
      "<div data-slot='select-content' data-state='open'></div>";

    expect(hasOpenScrollLockOverlay(document)).toBe(true);
  });

  it("clears stale body and html scroll locks when no overlay is open", () => {
    document.body.innerHTML = "";
    document.body.setAttribute("data-scroll-locked", "1");
    document.documentElement.setAttribute("data-base-ui-scroll-locked", "");
    document.body.style.setProperty("overflow", "hidden");
    document.body.style.setProperty("height", "100dvh");
    document.documentElement.style.setProperty("overflow-y", "hidden");

    expect(clearOrphanedScrollLocks(document)).toBe(true);
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
    expect(
      document.documentElement.hasAttribute("data-base-ui-scroll-locked"),
    ).toBe(false);
    expect(document.body.style.getPropertyValue("overflow")).toBe("");
    expect(document.body.style.getPropertyValue("height")).toBe("");
    expect(document.documentElement.style.getPropertyValue("overflow-y")).toBe(
      "",
    );
  });

  it("preserves active locks while an overlay is still open", () => {
    document.body.innerHTML =
      "<div data-slot='select-content' data-state='open'></div>";
    document.body.setAttribute("data-scroll-locked", "1");
    document.body.style.setProperty("overflow", "hidden");

    expect(clearOrphanedScrollLocks(document)).toBe(false);
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(true);
    expect(document.body.style.getPropertyValue("overflow")).toBe("hidden");
  });
});
