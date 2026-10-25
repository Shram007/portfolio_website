"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import { ProjectCard } from "@/components/projects/ProjectCard";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import ViewToggle from "@/components/ui/ViewToggle";
import { StardustButton } from "@/components/ui/StardustButton";
import { projects } from "@/lib/data/projects";
import { useMediaQuery } from "@/lib/hooks";

// three-dimensional view loads only when someone asks for it
const ProjectsCarousel3D = dynamic(() => import("@/components/sections/ProjectsCarousel3D"), { ssr: false });

const FEATURED_COUNT = 3;

type View = "grid" | "3d";

export default function ProjectsSection() {
  const [view, setView] = useState<View>("grid");
  const [showAll, setShowAll] = useState(false);

  // 3D needs a pointer-and-motion-friendly device; others only ever see the grid.
  const canShow3D = useMediaQuery("(min-width: 768px) and (hover: hover) and (prefers-reduced-motion: no-preference)");
  const in3D = canShow3D && view === "3d";

  const visible = showAll ? projects : projects.slice(0, FEATURED_COUNT);
  const hiddenCount = projects.length - FEATURED_COUNT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    >
      <Section ariaLabelledby="projects-title">
        <SectionHeader title="Projects" subtitle="A showcase of my work" titleId="projects-title" />

        {canShow3D && (
          <div className="mb-10 text-center">
            <ViewToggle
              label="Projects view"
              value={view}
              onChange={setView}
              options={[
                { value: "grid", label: "Grid" },
                { value: "3d", label: "3D" },
              ]}
            />
          </div>
        )}

        {in3D ? (
          <ProjectsCarousel3D />
        ) : (
          <>
            <ul id="project-list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {visible.map((project) => (
                <li key={project.id}>
                  <ProjectCard
                    title={project.title}
                    description={project.description}
                    stack={project.stack}
                    repoUrl={project.repoUrl}
                    demoUrl={project.demoUrl}
                    image={project.image}
                    effect={project.effect}
                  />
                </li>
              ))}
            </ul>

            {hiddenCount > 0 && (
              <div className="mt-10 text-center">
                <StardustButton
                  onClick={() => setShowAll((v) => !v)}
                  aria-expanded={showAll}
                  aria-controls="project-list"
                  className="text-sm font-medium"
                >
                  {showAll ? "Show fewer projects" : `Show all projects (${projects.length})`}
                </StardustButton>
              </div>
            )}
          </>
        )}
      </Section>
    </motion.div>
  );
}
