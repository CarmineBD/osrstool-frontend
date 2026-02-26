import { Outlet, useLocation } from "react-router-dom";
import { Nav } from "./Nav";

export type Props = Record<string, never>;

export function Layout(_props: Props) {
  void _props;
  const location = useLocation();
  const hideInput =
    location.pathname === "/" ||
    location.pathname === "/allMethods" ||
    location.pathname.startsWith("/skilling/") ||
    location.pathname === "/wiki" ||
    location.pathname.startsWith("/wiki/");
  return (
    <div className="min-h-screen flex flex-col">
      <Nav hideInput={hideInput} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
