"use client";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Light/dark switch. The initial theme is applied by a script in the page
 * <head> (see layout.tsx); this button flips it and remembers the choice.
 * Both icons are rendered and CSS shows the right one, so server and client
 * markup always match.
 */
export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // Private mode etc.: the toggle still works for this visit.
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Switch between light and dark theme" title="Light / dark theme">
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
