"use client";

import { projects } from "@/lib/data/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-semibold mb-6">Projects</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.title} {...p} />
        ))}
      </div>
    </main>
  );
}
