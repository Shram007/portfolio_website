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

  // Over the dark effect background everything turns light.
  const hoverText = hovered ? { color: "#ffffff" } : undefined;
  const hoverMuted = hovered ? { color: "#e5e7eb" } : undefined;
  const hoverBorder = hovered ? { borderColor: "#ffffff" } : undefined;

  return (
    <article
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setActive(false);
      }}
      className={cn(
        "group/canvas-card relative h-full min-h-[22rem] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800",
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

      {/* Foreground content */}
      <div className="relative z-10 flex h-full min-h-[22rem] flex-col justify-end p-5">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight" style={hoverText}>
            {title}
          </h3>
          {description && (
            <p
              className={cn("text-sm", !hovered && "text-neutral-600 dark:text-neutral-300")}
              style={hoverMuted}
            >
              {description}
            </p>
          )}
          {!!stack.length && (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Tech stack">
              {stack.map((tag) => (
                <li
                  key={tag}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs",
                    !hovered && "border-neutral-200 dark:border-neutral-700"
                  )}
                  style={{ ...hoverText, ...hoverBorder }}
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
          {(repoUrl || demoUrl) && (
            <div className="mt-3 flex gap-3">
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
      </div>
    </article>
  );
}
