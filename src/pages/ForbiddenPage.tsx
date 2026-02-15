import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type ForbiddenPageProps = {
  title?: string;
  description?: string;
};

const DEFAULT_TITLE = "403 - Access denied";
const DEFAULT_DESCRIPTION =
  "You do not have permission to access this page.";

export function ForbiddenPage({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: ForbiddenPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">HTTP 403</p>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}

export default ForbiddenPage;
