import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skills",
  description: "Technical skills and tools used by Shram Kadia.",
  alternates: { canonical: "/skills" },
};

import SkillsSection from "@/components/sections/SkillsSection";
export default function SkillsPage() { return <SkillsSection />; }
