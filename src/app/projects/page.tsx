import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected projects by Shram Kadia: AI voice ordering, healthcare copilot, QA automation and more.",
  alternates: { canonical: "/projects" },
};

import ProjectsSection from "@/components/sections/ProjectsSection";

export default function ProjectsPage() { return <ProjectsSection />; }
