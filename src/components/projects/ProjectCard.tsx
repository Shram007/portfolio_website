"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { ProjectCardProps } from "@/lib/types";

// WebGL effect only needed on hover: keep three.js out of the initial bundle.
const CanvasRevealEffect = dynamic(
  () => import("@/components/ui/canvas-reveal-effect").then((m) => m.CanvasRevealEffect),
  { ssr: false }
);

/** True only for mouse-like pointers with motion allowed; touch and reduced-motion users get the plain card. */
function useFancyHover() {
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return enabled;
}

export function ProjectCard({
  title,
  description,
  stack = [],
  repoUrl,
  demoUrl,
  effect = { bgClass: "bg-neutral-900", animationSpeed: 3, colors: [[125, 211, 252]], dotSize: 2 },
  className,
}: ProjectCardProps) {
  const fancy = useFancyHover();
  const [active, setActive] = React.useState(false);
  const hovered = fancy && active;

  const [expanded, setExpanded] = React.useState(false);

  // Over the dark effect background everything turns light.
  const hoverText = hovered ? { color: "#ffffff" } : undefined;
  const hoverMuted = hovered ? { color: "#e5e7eb" } : undefined;
  const hoverBorder = hovered ? { borderColor: "#ffffff" } : undefined;

  const MAX_TAGS = 2;
  const shownTags = stack.slice(0, MAX_TAGS);
  const hiddenTags = stack.slice(MAX_TAGS);

  return (
    <article
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setActive(false);
      }}
      className={cn(
        "group/canvas-card relative h-72 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800",
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
            aria-hidden
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

      {/* Foreground: fixed rows so every card lines up; long text is trimmed to leave the effect visible */}
      <div className="relative z-10 flex h-full flex-col p-5">
        <h3 className="line-clamp-2 h-14 text-lg font-semibold leading-7 tracking-tight" style={hoverText}>
          {title}
        </h3>

        {/* Trimmed by default so the effect stays visible; click the text or "+N" to read it all */}
        <div className={cn("min-h-0", expanded ? "flex-1 overflow-y-auto" : "shrink-0")}>
          {description && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              title={expanded ? "Show less" : "Click to read the full description"}
              className={cn(
                "mt-2 block w-full cursor-pointer text-left text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                expanded ? "h-auto" : "line-clamp-3 h-[4.3rem]",
                !hovered && "text-neutral-600 dark:text-neutral-300"
              )}
              style={hoverMuted}
            >
              {description}
            </button>
          )}

          {!!stack.length && (
            <ul
              className={cn("mt-3 flex gap-2", expanded ? "flex-wrap" : "h-6 flex-nowrap overflow-hidden")}
              aria-label="Tech stack"
            >
              {(expanded ? stack : shownTags).map((tag) => (
                <li
                  key={tag}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs leading-4",
                    !hovered && "border-neutral-200 dark:border-neutral-700"
                  )}
                  style={{ ...hoverText, ...hoverBorder }}
                >
                  {tag}
                </li>
              ))}
              {hiddenTags.length > 0 && (
                <li className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    aria-label={expanded ? "Show fewer details" : `Show ${hiddenTags.length} more: ${hiddenTags.join(", ")}`}
                    className={cn(
                      "cursor-pointer whitespace-nowrap rounded-md border px-2 py-0.5 text-xs leading-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                      !hovered && "border-neutral-200 dark:border-neutral-700"
                    )}
                    style={{ ...hoverText, ...hoverBorder }}
                  >
                    {expanded ? "Less" : `+${hiddenTags.length}`}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {(repoUrl || demoUrl) && (
          <div className="mt-auto flex shrink-0 gap-3">
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center px-1 text-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                style={hoverText}
                aria-label={`Demo: ${title} (opens in new tab)`}
              >
                Demo
              </a>
            )}
            {repoUrl && (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center px-1 text-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                style={hoverText}
                aria-label={`Repo: ${title} source code (opens in new tab)`}
              >
                Repo
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
