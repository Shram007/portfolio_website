"use client";

import { Timeline } from "@/components/ui/timeline";

export default function EducationSection() {
  const data = [
    { title: "MS — Computer Science (2023–2025)", content: <p>Focus: ML, Systems; capstone on X.</p> },
    { title: "BS — Computer Science (2019–2023)", content: <p>Honors; projects in web & data engineering.</p> },
  ];
  return (
    <section aria-labelledby="education-title">
      <h2 id="education-title" className="sr-only">Education</h2>
      <Timeline data={data} />
    </section>
  );
}
