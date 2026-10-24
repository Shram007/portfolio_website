import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experience",
  description: "Work experience of Shram Kadia, software engineer.",
  alternates: { canonical: "/experience" },
};

import WorkExperience from "@/components/sections/WorkExperience"; // default export is the component
import { experiences } from "@/lib/data/experience";                 // <- your data file

export default function ExperiencePage() {
  return <WorkExperience experiences={experiences} />;
}
