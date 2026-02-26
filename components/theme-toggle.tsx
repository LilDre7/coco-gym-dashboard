"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  vertical?: boolean;
  showLabels?: boolean;
}

export function ThemeToggle({ vertical = false, showLabels = true }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const changeThemeWithTransition = (nextTheme: "dark" | "black") => {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    setTheme(nextTheme);
    window.setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 320);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-card",
        vertical ? "flex-col gap-1 p-1" : "items-center gap-1"
      )}
    >
      <Button
        type="button"
        size="sm"
        variant={theme === "dark" ? "default" : "ghost"}
        onClick={() => changeThemeWithTransition("dark")}
        className={cn(
          "h-8 rounded-md text-xs",
          showLabels ? "gap-1.5 px-2" : "w-8 px-0"
        )}
      >
        <Sun className="h-3.5 w-3.5" />
        {showLabels ? "Claro" : <span className="sr-only">Claro</span>}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={theme === "black" ? "default" : "ghost"}
        onClick={() => changeThemeWithTransition("black")}
        className={cn(
          "h-8 rounded-md text-xs",
          showLabels ? "gap-1.5 px-2" : "w-8 px-0"
        )}
      >
        <Moon className="h-3.5 w-3.5" />
        {showLabels ? "Oscuro" : <span className="sr-only">Oscuro</span>}
      </Button>
    </div>
  );
}
