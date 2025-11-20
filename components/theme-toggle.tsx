"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useCanvasStore } from "@/lib/canvas-store";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { updateStrokeForTheme } = useCanvasStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 bg-transparent"
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">主题切换</span>
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");

    updateStrokeForTheme(newTheme === "dark");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-8 w-8 p-0 bg-transparent"
    >
      <Sun
        className={`h-4 w-4 transition-all ${
          isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all ${
          isDark ? "rotate-0 scale-100" : "rotate-90 scale-0"
        }`}
      />
      <span className="sr-only">主题切换</span>
    </Button>
  );
}
