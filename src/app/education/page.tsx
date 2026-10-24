import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Education",
  description: "Education background of Shram Kadia.",
  alternates: { canonical: "/education" },
};

import EducationSection from "@/components/sections/EducationSection";
export default function EducationPage() { return <EducationSection />; }
