import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  labelClassName?: string;
};

export function ThemeToggle({
  className,
  labelClassName,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background/85 px-2.5 py-1.5 shadow-sm backdrop-blur sm:px-3",
        className,
      )}
    >
      <Sun
        aria-hidden="true"
        className={cn(
          "size-4 transition-colors",
          isDark ? "text-muted-foreground" : "text-warning",
        )}
      />
      <Switch
        checked={isDark}
        aria-label={isDark ? "Disable dark mode" : "Enable dark mode"}
        onCheckedChange={toggleTheme}
      />
      <Moon
        aria-hidden="true"
        className={cn(
          "size-4 transition-colors",
          isDark ? "text-info" : "text-muted-foreground",
        )}
      />
      <span
        className={cn(
          "text-xs font-medium text-muted-foreground",
          labelClassName,
        )}
      >
        {isDark ? "Dark mode" : "Light mode"}
      </span>
    </div>
  );
}
