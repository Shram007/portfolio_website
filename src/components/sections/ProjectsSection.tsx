"use client";

import { useState } from "react";
import { projects } from "@/lib/data/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import ThreeDProjectsCarousel from "./3DProjectsCarousel";

export default function ProjectsSection() {
  const [view, setView] = useState<"grid" | "3d">("grid");

  return (
    <section aria-labelledby="projects-title" className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="projects-title" className="text-3xl font-semibold">Projects</h2>

        <div className="rounded-md border border-neutral-200 p-1 text-sm dark:border-neutral-800">
          <button
            onClick={() => setView("grid")}
            className={`rounded px-3 py-1 ${view === "grid" ? "bg-neutral-200 dark:bg-neutral-800" : ""}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView("3d")}
            className={`rounded px-3 py-1 ${view === "3d" ? "bg-neutral-200 dark:bg-neutral-800" : ""}`}
          >
            3D
          </button>
        </div>
      </div>

      {view === "3d" ? (
        <ThreeDProjectsCarousel />
      ) : (
        <>
          {/* Mobile: horizontal snap */}
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
          </div>

          {/* Desktop: 3×2 grid */}
          <div className="hidden lg:grid grid-cols-3 gap-6 auto-rows-[22rem]">
            {projects.map((p) => (
              <ProjectCard key={p.title} {...p} className="h-[22rem]" />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
