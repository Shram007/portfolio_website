// server component (can render client children)
"use client";

// server component (no hooks)
import { projects } from "@/lib/data/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default function ProjectsSection() {
  return (
    <section aria-labelledby="projects-title" className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="projects-title" className="text-3xl font-semibold">Projects</h2>

        {/* optional: simple count */}
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{projects.length} items</span>
      </div>

      {/* Mobile / tablet: horizontal snap carousel */}
      <div
        className="lg:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] [-ms-overflow-style:none]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-4">
          {projects.map((p) => (
            <div key={p.title} className="snap-start shrink-0 w-[88%] sm:w-[70%]">
              <ProjectCard {...p} className="h-[22rem]" />
            </div>
          ))}
        </div>

        {/* optional swipe hint—remove if you don’t want it */}
        <div className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
          ⇠ swipe to explore ⇢
        </div>
      </div>

      {/* Desktop: 3×2 grid */}
      <div className="hidden lg:grid grid-cols-3 gap-6 auto-rows-[22rem]">
        {projects.map((p) => (
          <ProjectCard key={p.title} {...p} className="h-[22rem]" />
        ))}
      </div>
    </section>
  );
}

