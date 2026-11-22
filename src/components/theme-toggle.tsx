"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icon";

export default function ThemeToggle() {
  useEffect(() => {
    const saved = window.localStorage.getItem("oneatlas-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextDark = saved ? saved === "dark" : prefersDark;
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
  }, []);

  function toggleTheme() {
    const nextDark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    window.localStorage.setItem("oneatlas-theme", nextDark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      className="icon-button theme-button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
    >
      <span className="theme-icon theme-moon"><Icon name="moon" size={18} /></span>
      <span className="theme-icon theme-sun"><Icon name="sun" size={18} /></span>
    </button>
  );
}
