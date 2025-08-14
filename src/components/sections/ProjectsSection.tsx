// server component (can render client children)
"use client";

import { projects } from "@/lib/data/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default function ProjectsSection() {
  return (
    <section aria-labelledby="projects-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="projects-title" className="text-3xl font-semibold mb-6">Projects</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.title} {...p} />
        ))}
      </div>
    </section>
  );
}
