import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Footer } from "./Footer";
import { Nav } from "./Nav";
import { clearOrphanedScrollLocks } from "@/lib/scrollLock";
import { getEnvironmentRobotsDirective } from "@/hooks/useSeo";

export type Props = Record<string, never>;

export function Layout(_props: Props) {
  void _props;
  const location = useLocation();
  const cleanupFrameRef = useRef<number | null>(null);
  const hideInput =
    location.pathname === "/" ||
    location.pathname === "/wiki" ||
    location.pathname.startsWith("/wiki/");
  const isPrivateRoute = [
    "/login",
    "/create-account",
    "/forgot-password",
    "/reset-password",
    "/account",
    "/accept-terms",
    "/roadmaps",
    "/admin",
    "/moneyMakingMethod/new",
  ].some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(`${path}/`),
  ) || location.pathname.endsWith("/edit");
  const environmentRobots = getEnvironmentRobotsDirective();

  useEffect(() => {
    const scheduleCleanup = () => {
      if (cleanupFrameRef.current !== null) {
        window.cancelAnimationFrame(cleanupFrameRef.current);
      }

      cleanupFrameRef.current = window.requestAnimationFrame(() => {
        cleanupFrameRef.current = null;
        clearOrphanedScrollLocks();
      });
    };

    scheduleCleanup();

    const observer = new MutationObserver(() => {
      scheduleCleanup();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "data-scroll-locked"],
      childList: true,
      subtree: true,
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "data-base-ui-scroll-locked"],
      childList: true,
      subtree: true,
    });

    window.addEventListener("pageshow", scheduleCleanup);
    window.addEventListener("pointerup", scheduleCleanup);
    window.addEventListener("keyup", scheduleCleanup);

    return () => {
      observer.disconnect();
      window.removeEventListener("pageshow", scheduleCleanup);
      window.removeEventListener("pointerup", scheduleCleanup);
      window.removeEventListener("keyup", scheduleCleanup);

      if (cleanupFrameRef.current !== null) {
        window.cancelAnimationFrame(cleanupFrameRef.current);
        cleanupFrameRef.current = null;
      }
    };
  }, [location.pathname]);

  useEffect(() => {
    const selector = 'meta[name="robots"]';
    const existing = document.head.querySelector<HTMLMetaElement>(selector);

    if (environmentRobots) {
      const tag = existing ?? document.createElement("meta");
      tag.name = "robots";
      tag.content = environmentRobots;
      tag.dataset.rsmethodsSeoRobots = "environment";
      if (!existing) document.head.appendChild(tag);
      return;
    }

    if (isPrivateRoute) {
      const tag = existing ?? document.createElement("meta");
      tag.name = "robots";
      tag.content = "noindex, follow";
      tag.dataset.rsmethodsRouteRobots = "private";
      if (!existing) document.head.appendChild(tag);
      return;
    }

    if (existing?.dataset.rsmethodsSeoRobots !== "explicit") {
      existing?.remove();
    }
  }, [environmentRobots, isPrivateRoute, location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav hideInput={hideInput} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
