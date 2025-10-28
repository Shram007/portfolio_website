"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import { cn } from "../../lib/utils";
import { ProjectCardProps } from "@/lib/types";

export function ProjectCard({
  title,
  description,
  stack = [],
  repoUrl,
  demoUrl,
  effect = { bgClass: "bg-neutral-900", animationSpeed: 3, colors: [[125,211,252]], dotSize: 2 },
  className,
}: ProjectCardProps) {
  const [hovered, setHovered] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(true);

  React.useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      if (typeof window !== "undefined") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(isDark);
      }
    };

    checkTheme();

    // Listen for theme changes
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Theme-aware hover colors - using inline styles for maximum reliability
  const getHoverTextStyle = () => {
    if (!hovered) return {};
    return { color: isDarkMode ? '#ffffff' : '#ffffff' }; // Always white on hover
  };

  const getHoverTextMutedStyle = () => {
    if (!hovered) return {};
    return { color: isDarkMode ? '#e5e7eb' : '#e5e7eb' }; // Always light gray on hover
  };

  const getHoverBorderStyle = () => {
    if (!hovered) return {};
    return { borderColor: isDarkMode ? '#ffffff' : '#ffffff' }; // Always white borders on hover
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group/canvas-card relative h-[22rem] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800",
        className
      )}
    >
      {/* Hover background */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <CanvasRevealEffect
              animationSpeed={effect.animationSpeed ?? 3}
              containerClassName={effect.bgClass ?? "bg-neutral-900"}
              colors={effect.colors ?? [[125, 211, 252]]}
              dotSize={effect.dotSize ?? 2}
              opacities={effect.opacities}
            />
            <div className="absolute inset-0 [mask-image:radial-gradient(400px_at_center,white,transparent)] bg-black/40 dark:bg-black/70" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foreground content */}
      <div className="relative z-10 flex h-full flex-col justify-end p-5">
        <div className="space-y-2">
          <h3 
            className="text-lg font-semibold tracking-tight"
            style={getHoverTextStyle()}
          >
            {title}
          </h3>
          {description && (
            <p 
              className={cn(
                "text-sm line-clamp-3",
                !hovered && "text-neutral-600 dark:text-neutral-300"
              )}
              style={getHoverTextMutedStyle()}
            >
              {description}
            </p>
          )}
          {!!stack.length && (
            <div className="mt-2 flex flex-wrap gap-2">
              {stack.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs border",
                    !hovered && "border-neutral-200 dark:border-neutral-700"
                  )}
                  style={{
                    ...getHoverTextStyle(),
                    ...getHoverBorderStyle()
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {(repoUrl || demoUrl) && (
            <div className="mt-3 flex gap-3">
              {demoUrl && (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline underline-offset-4 hover:no-underline"
                  style={getHoverTextStyle()}
                  aria-label={`${title} live demo`}
                >
                  Demo
                </a>
              )}
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline underline-offset-4 hover:no-underline"
                  style={getHoverTextStyle()}
                  aria-label={`${title} repository`}
                >
                  Repo
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
