"use client";

import { ProjectCard } from "@/components/projects/ProjectCard";
import ThreeDProjectsCarousel from "@/components/sections/3DProjectsCarousel";
import { projects } from "@/lib/data/projects";
import { useState } from "react";

export default function ProjectsSection() {
  const [showMore, setShowMore] = useState(false);
  
  // Top 3 projects for featured section
  const featuredProjects = projects.slice(0, 3);
  
  // Remaining projects for "View More" section
  const moreProjects = projects.slice(3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold">Projects</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          A showcase of my work
        </p>
      </div>

      {/* Featured Projects - Top 3 */}
      <div className="mb-16">
        {/* <h3 className="mb-8 text-xl font-semibold text-center">Featured Projects</h3> */}
        <div className="grid gap-6 place-items-center auto-rows-fr" 
             style={{
               gridTemplateColumns: `repeat(${Math.min(3, featuredProjects.length)}, 1fr)`,
               maxWidth: `${Math.min(3, featuredProjects.length) * 350 + (Math.min(3, featuredProjects.length) - 1) * 24}px`,
               margin: '0 auto'
             }}>
          {featuredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              title={project.title}
              description={project.description}
              stack={project.stack}
              repoUrl={project.repoUrl}
              demoUrl={project.demoUrl}
              effect={project.effect}
            />
          ))}
        </div>
      </div>

      {/* More Projects Section - Carousel */}
      {moreProjects.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => setShowMore(!showMore)}
            className="rounded-lg bg-neutral-800 px-6 py-3 text-sm font-medium transition-colors hover:bg-neutral-700"
          >
            {showMore ? 'Hide More Projects' : `View More Projects (${moreProjects.length})`}
          </button>
          
          {showMore && (
            <div className="mt-8">
              <ThreeDProjectsCarousel />
            </div>
          )}
        </div>
      )}
    </div>
  );
}