import { useLocation, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { useUsername } from "@/contexts/UsernameContext";
import { useToggleVariantLike } from "./hooks";

const LIKE_LOGIN_REQUIRED_MESSAGE = "Sign in to like variants";

type Props = {
  methodId: string;
  variantId: string;
  likedByMe?: boolean;
  likes?: number;
  className?: string;
  showCount?: boolean;
};

export function LikeButton({
  methodId,
  variantId,
  likedByMe,
  likes,
  className,
  showCount = true,
}: Props) {
  const { session } = useAuth();
  const { setUserError } = useUsername();
  const navigate = useNavigate();
  const location = useLocation();
  const toggleLikeMutation = useToggleVariantLike();

  const isLiked = likedByMe === true;
  const hasLikeCount = showCount && typeof likes === "number";

  const handleClick = () => {
    if (!session) {
      setUserError(LIKE_LOGIN_REQUIRED_MESSAGE);
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return;
    }

    toggleLikeMutation.mutate({ methodId, variantId, likedByMe: isLiked });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={toggleLikeMutation.isPending}
      aria-label={isLiked ? "Unlike variant" : "Like variant"}
      className={cn("h-8 gap-2 px-2", className)}
    >
      <Heart
        className={cn(
          "h-4 w-4 shrink-0",
          isLiked ? "fill-danger text-danger" : "text-muted-foreground",
        )}
      />
      {hasLikeCount ? (
        <span className="min-w-8 text-right tabular-nums">
          {formatNumber(likes)}
        </span>
      ) : null}
    </Button>
  );
}
