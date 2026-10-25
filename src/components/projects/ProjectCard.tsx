"use client";

import * as React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { ProjectCardProps } from "@/lib/types";

// WebGL effect only needed on hover: keep three.js out of the initial bundle.
const CanvasRevealEffect = dynamic(
  () => import("@/components/ui/canvas-reveal-effect").then((m) => m.CanvasRevealEffect),
  { ssr: false }
);

const linkClass =
  "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";

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
  image,
  effect = { bgClass: "bg-neutral-900", animationSpeed: 3, colors: [[125, 211, 252]], dotSize: 2 },
  className,
}: ProjectCardProps) {
  const fancy = useFancyHover();
  const [active, setActive] = React.useState(false);
  const showEffect = fancy && active;

  return (
    <article
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setActive(false);
      }}
      className={cn(
        "group/canvas-card relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white/60 dark:border-neutral-800 dark:bg-neutral-900/60",
        className
      )}
    >
      <AnimatePresence>
        {showEffect && (
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
            <div className="absolute inset-0 bg-black/60" />
          </motion.div>
        )}
      </AnimatePresence>

      {image ? (
        <div className="relative h-40 w-full shrink-0">
          <Image
            src={image}
            alt={`Screenshot of ${title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="relative flex h-40 w-full shrink-0 items-center justify-center bg-gradient-to-br from-violet-600/30 to-sky-500/30 text-4xl font-bold text-neutral-700 dark:text-neutral-200"
        >
          {title
            .split(/[\s:]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0].toUpperCase())
            .join("")}
        </div>
      )}

      <div className={cn("relative z-10 flex flex-1 flex-col p-5", showEffect && "text-white")}>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description && (
          <p
            className={cn(
              "mt-2 text-sm leading-relaxed",
              showEffect ? "text-neutral-200" : "text-neutral-600 dark:text-neutral-300"
            )}
          >
            {description}
          </p>
        )}
        {!!stack.length && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tech stack">
            {stack.map((tag) => (
              <li
                key={tag}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs",
                  showEffect ? "border-white/60" : "border-neutral-300 dark:border-neutral-700"
                )}
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
        {(repoUrl || demoUrl) && (
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  linkClass,
                  "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                )}
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
                className={cn(linkClass, "border border-neutral-500/50 hover:bg-neutral-500/10")}
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
