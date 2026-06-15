import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/**
 * Animated dark/light toggle button.
 * Renders a Moon icon in dark mode and a Sun icon in light mode.
 */
const ThemeToggle = ({ className = "" }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative p-2 rounded-xl transition-all duration-300 group
        ${isDark
          ? "text-slate-400 hover:text-amber-300 hover:bg-amber-400/10"
          : "text-slate-500 hover:text-violet-600 hover:bg-violet-500/10"
        } ${className}`}
    >
      {/* Animated icon swap */}
      <span
        className="block transition-all duration-300"
        style={{
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(180deg) scale(0.9)",
          opacity: isDark ? 1 : 0,
          position: isDark ? "relative" : "absolute",
        }}
      >
        <Moon size={16} />
      </span>
      <span
        className="block transition-all duration-300"
        style={{
          transform: !isDark ? "rotate(0deg) scale(1)" : "rotate(-180deg) scale(0.9)",
          opacity: !isDark ? 1 : 0,
          position: !isDark ? "relative" : "absolute",
        }}
      >
        <Sun size={16} />
      </span>
    </button>
  );
};

export default ThemeToggle;
