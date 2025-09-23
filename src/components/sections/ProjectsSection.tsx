"use client";

import { ProjectCard } from "@/components/projects/ProjectCard";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import ThreeDProjectsCarousel from "@/components/sections/3DProjectsCarousel";
import { projects } from "@/lib/data/projects";
import { useState } from "react";
import { motion } from "framer-motion";
import { StardustButton } from "@/components/ui/StardustButton";

export default function ProjectsSection() {
  const [showMore, setShowMore] = useState(false);
  
  // Top 3 projects for featured section
  const featuredProjects = projects.slice(0, 3);
  
  // Remaining projects for "View More" section
  const moreProjects = projects.slice(3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    >
      <Section ariaLabelledby="projects-title">
        <SectionHeader
          title="Projects"
          subtitle="A showcase of my work"
          titleId="projects-title"
        />

        {/* Featured Projects - Top 3 */}
        <div className="mb-16">
        {/* <h3 className="mb-8 text-xl font-semibold text-center">Featured Projects</h3> */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {featuredProjects.map((project) => (
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
            <StardustButton
            onClick={() => setShowMore(!showMore)}
            className="py text-sm font-medium"
            >
            {showMore ? 'Hide More Projects' : `View More Projects (${moreProjects.length})`}
            </StardustButton>
          
          {showMore && (
            <div className="mt-8">
              <ThreeDProjectsCarousel />
            </div>
          )}
        </div>
      )}
    </Section>
    </motion.div>
  );
}