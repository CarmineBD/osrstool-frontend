import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DEFAULT_TITLE = "404 - Page not found";
const DEFAULT_DESCRIPTION =
  "The page you are looking for does not exist or was moved.";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">HTTP 404</p>
      <h1 className="text-2xl font-bold tracking-tight">{DEFAULT_TITLE}</h1>
      <p className="text-sm text-muted-foreground">{DEFAULT_DESCRIPTION}</p>
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}

export default NotFoundPage;
